import crypto from 'crypto';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import {
  ClaimStatus,
  ClaimType,
  AuditAction,
  AuditSeverity,
  ConsentScope,
  ConsentStatus,
  Prisma,
} from '@prisma/client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function httpError(message: string, statusCode: number, code?: string): never {
  const err = new Error(message) as Error & { statusCode: number; code?: string };
  err.statusCode = statusCode;
  if (code) err.code = code;
  throw err;
}

function generateClaimNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `CLM-${year}-${rand}`;
}

async function writeAuditLog(params: {
  actorId: string;
  actorRole: string;
  targetId?: string;
  action: AuditAction;
  severity?: AuditSeverity;
  details?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId:    params.actorId,
        actorRole:  params.actorRole as import('@prisma/client').Role,
        action:     params.action,
        severity:   params.severity ?? AuditSeverity.LOW,
        targetId:   params.targetId   ?? null,
        targetType: params.targetId   ? 'InsuranceClaim' : null,
        metadata:   params.details !== undefined ? (params.details as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  } catch (e) {
    logger.error('Audit log write failed', e);
  }
}

// ─── Valid state transitions ──────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  [ClaimStatus.SUBMITTED]:    [ClaimStatus.UNDER_REVIEW],
  [ClaimStatus.UNDER_REVIEW]: [ClaimStatus.APPROVED, ClaimStatus.REJECTED, ClaimStatus.HOLD],
  [ClaimStatus.HOLD]:         [ClaimStatus.UNDER_REVIEW, ClaimStatus.APPROVED, ClaimStatus.REJECTED],
  [ClaimStatus.APPROVED]:     [ClaimStatus.PAID],
  [ClaimStatus.REJECTED]:     [],  // terminal
  [ClaimStatus.PAID]:         [],  // terminal
};

// ─── Fraud Detection ─────────────────────────────────────────────────────────

type FraudFlag =
  | 'DUPLICATE_CLAIM'
  | 'DIAGNOSIS_MISMATCH'
  | 'DATE_ANOMALY'
  | 'HIGH_FREQUENCY'
  | 'FACILITY_UNREGISTERED';

interface FraudResult {
  score: number;
  flags: FraudFlag[];
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

async function runFraudDetection(params: {
  patientId: string;
  insuranceProviderId: string;
  claimType: ClaimType;
  icd10Code: string;
  admissionDate: Date;
  dischargeDate?: Date;
  hospitalName: string;
  claimedAmount: number;
}): Promise<FraudResult> {
  const flags: FraudFlag[] = [];
  let score = 0;

  // 1. DUPLICATE_CLAIM — same patient + icd10 + type in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const duplicate = await prisma.insuranceClaim.count({
    where: {
      patientId:  params.patientId,
      icd10Code:  params.icd10Code,
      claimType:  params.claimType,
      createdAt:  { gte: thirtyDaysAgo },
    },
  });
  if (duplicate > 0) {
    flags.push('DUPLICATE_CLAIM');
    score += 35;
  }

  // 2. HIGH_FREQUENCY — more than 5 claims from this provider in 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentProviderClaims = await prisma.insuranceClaim.count({
    where: {
      insuranceProviderId: params.insuranceProviderId,
      createdAt:           { gte: sevenDaysAgo },
    },
  });
  if (recentProviderClaims > 5) {
    flags.push('HIGH_FREQUENCY');
    score += 20;
  }

  // 3. DATE_ANOMALY — discharge before admission
  if (params.dischargeDate && params.admissionDate) {
    if (params.dischargeDate < params.admissionDate) {
      flags.push('DATE_ANOMALY');
      score += 25;
    }
  }

  // 4. FACILITY_UNREGISTERED — hospital not in our verified list
  const verifiedHospital = await prisma.hospital.findFirst({
    where: {
      isVerified: true,
      name:       { contains: params.hospitalName, mode: 'insensitive' },
    },
  });
  if (!verifiedHospital) {
    flags.push('FACILITY_UNREGISTERED');
    score += 15;
  }

  // 5. DIAGNOSIS_MISMATCH — very high amount for outpatient/diagnostic
  if (
    (params.claimType === ClaimType.OUTPATIENT) &&
    params.claimedAmount > 500_000
  ) {
    flags.push('DIAGNOSIS_MISMATCH');
    score += 20;
  }

  score = Math.min(100, score);

  let riskLevel: FraudResult['riskLevel'];
  if (score <= 25)       riskLevel = 'LOW';
  else if (score <= 50)  riskLevel = 'MODERATE';
  else if (score <= 75)  riskLevel = 'HIGH';
  else                   riskLevel = 'CRITICAL';

  return { score, flags, riskLevel };
}

// ─── POST /insurance/claims — Submit new claim ────────────────────────────────

export async function submitClaim(
  userId: string,
  body: {
    patientUhid: string;
    policyNumber?: string;
    claimType: ClaimType;
    diagnosis: string;
    icd10Code: string;
    admissionDate: string;
    dischargeDate?: string;
    hospitalName: string;
    claimedAmount: number;
    currency?: string;
    notes?: string;
  },
) {
  // 1. Resolve InsuranceProvider
  const provider = await prisma.insuranceProvider.findUnique({
    where: { userId },
  });
  if (!provider) httpError('Insurance provider profile not found', 404);

  // 2. Resolve Patient by UHID
  const patient = await prisma.patient.findUnique({
    where: { uhid: body.patientUhid },
  });
  if (!patient) httpError('Patient not found for the given UHID', 404, 'PATIENT_NOT_FOUND');

  // 3. Generate unique claim number
  let claimNumber = generateClaimNumber();
  let attempts = 0;
  while (await prisma.insuranceClaim.findUnique({ where: { claimNumber } })) {
    claimNumber = generateClaimNumber();
    if (++attempts > 10) httpError('Failed to generate unique claim number', 500);
  }

  const admissionDate = new Date(body.admissionDate);
  const dischargeDate = body.dischargeDate ? new Date(body.dischargeDate) : undefined;

  // 4. Run fraud detection
  const fraud = await runFraudDetection({
    patientId:           patient.id,
    insuranceProviderId: provider.id,
    claimType:           body.claimType,
    icd10Code:           body.icd10Code,
    admissionDate,
    dischargeDate,
    hospitalName:        body.hospitalName,
    claimedAmount:       body.claimedAmount,
  });

  // 5. Create claim
  const claim = await prisma.insuranceClaim.create({
    data: {
      claimNumber,
      patientId:           patient.id,
      insuranceProviderId: provider.id,
      policyNumber:        body.policyNumber,
      claimType:           body.claimType,
      diagnosis:           body.diagnosis,
      icd10Code:           body.icd10Code,
      admissionDate,
      dischargeDate,
      hospitalName:        body.hospitalName,
      claimedAmount:       body.claimedAmount,
      currency:            body.currency ?? 'INR',
      notes:               body.notes,
      fraudScore:          fraud.score,
      fraudFlags:          fraud.flags,
      status:              ClaimStatus.SUBMITTED,
    },
  });

  await writeAuditLog({
    actorId:   userId,
    actorRole: 'INSURANCE_PROVIDER',
    targetId:  claim.id,
    action:    AuditAction.CLAIM_SUBMITTED,
    severity:  fraud.riskLevel === 'CRITICAL' ? AuditSeverity.CRITICAL
             : fraud.riskLevel === 'HIGH'     ? AuditSeverity.HIGH
             : AuditSeverity.LOW,
    details: { claimNumber, fraudScore: fraud.score, riskLevel: fraud.riskLevel },
  });

  return {
    claimId:     claim.id,
    claimNumber: claim.claimNumber,
    status:      claim.status,
    fraudScore:  fraud.score,
    riskLevel:   fraud.riskLevel,
  };
}

// ─── POST /insurance/claims/:id/request-access ────────────────────────────────

export async function requestPatientAccess(
  userId: string,
  claimId: string,
  body: {
    scope: ConsentScope[];
    purpose: string;
    durationDays: number;
  },
) {
  const provider = await prisma.insuranceProvider.findUnique({ where: { userId } });
  if (!provider) httpError('Insurance provider profile not found', 404);

  const claim = await prisma.insuranceClaim.findUnique({
    where: { id: claimId },
    include: { patient: true },
  });
  if (!claim) httpError('Claim not found', 404);
  if (claim!.insuranceProviderId !== provider!.id)
    httpError('You do not have access to this claim', 403);

  const expiresAt = new Date(Date.now() + body.durationDays * 24 * 60 * 60 * 1000);

  const consent = await prisma.consent.create({
    data: {
      patientId:           claim!.patient.id,
      grantedToType:       'INSURANCE_PROVIDER',
      insuranceProviderId: provider!.id,
      scope:               body.scope,
      purpose:             body.purpose,
      status:              ConsentStatus.PENDING,
      isTemporary:         true,
      durationHours:       body.durationDays * 24,
      expiresAt,
    },
  });

  return {
    consentId:   consent.id,
    status:      consent.status,
    scope:       consent.scope,
    expiresAt:   consent.expiresAt,
    message:     'Access request sent to patient for approval',
  };
}

// ─── GET /insurance/claims/:id/records ───────────────────────────────────────

export async function getClaimPatientRecords(userId: string, claimId: string) {
  const provider = await prisma.insuranceProvider.findUnique({ where: { userId } });
  if (!provider) httpError('Insurance provider profile not found', 404);

  const claim = await prisma.insuranceClaim.findUnique({
    where: { id: claimId },
    include: { patient: true },
  });
  if (!claim) httpError('Claim not found', 404);
  if (claim!.insuranceProviderId !== provider!.id)
    httpError('You do not have access to this claim', 403);

  // Find active approved consent
  const now = new Date();
  const consent = await prisma.consent.findFirst({
    where: {
      patientId:           claim!.patient.id,
      insuranceProviderId: provider!.id,
      status:              ConsentStatus.ACTIVE,
      expiresAt:           { gt: now },
    },
    orderBy: { grantedAt: 'desc' },
  });

  if (!consent) httpError('No active consent. Please request access from the patient.', 403, 'NO_CONSENT');

  // Fetch records within consent scope
  const scopeTypes = consent!.scope.includes(ConsentScope.ALL)
    ? undefined
    : consent!.scope.map((s) => s.toString());

  const records = await prisma.medicalRecord.findMany({
    where: {
      patientId: claim!.patient.id,
      isDeleted: false,
      ...(scopeTypes ? { recordType: { in: scopeTypes as import('@prisma/client').RecordType[] } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id:         true,
      recordType: true,
      title:      true,
      description:true,
      fileUrl:    true,
      fileHash:   true,
      createdAt:  true,
      hospital:   { select: { name: true } },
      uploadedByStaff: { select: { firstName: true, staffType: true } },
    },
  });

  return {
    records: records.map((r) => ({
      id:          r.id,
      type:        r.recordType,
      title:       r.title,
      description: r.description,
      signedUrl:   r.fileUrl,
      fileHash:    r.fileHash,
      uploadedAt:  r.createdAt,
      hospital:    r.hospital?.name,
    })),
    consentScope:     consent!.scope,
    consentExpiresAt: consent!.expiresAt,
  };
}

// ─── POST /insurance/verify-record ───────────────────────────────────────────

export async function verifyRecord(
  userId: string,
  recordId: string,
  fileBuffer: Buffer,
) {
  const provider = await prisma.insuranceProvider.findUnique({ where: { userId } });
  if (!provider) httpError('Insurance provider profile not found', 404);

  const record = await prisma.medicalRecord.findUnique({
    where: { id: recordId },
    include: {
      uploadedByStaff: { select: { firstName: true, lastName: true } },
    },
  });
  if (!record) httpError('Record not found', 404);

  const submittedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const isAuthentic   = submittedHash === record!.fileHash;

  await writeAuditLog({
    actorId:   userId,
    actorRole: 'INSURANCE_PROVIDER',
    targetId:  recordId,
    action:    AuditAction.RECORD_VERIFIED,
    severity:  isAuthentic ? AuditSeverity.LOW : AuditSeverity.HIGH,
    details: { recordId, isAuthentic, submittedHash },
  });

  return {
    recordId:     record!.id,
    originalHash: record!.fileHash,
    submittedHash,
    isAuthentic,
    verifiedAt:   new Date().toISOString(),
    recordType:   record!.recordType,
    uploadedAt:   record!.createdAt,
    uploadedBy:   record!.uploadedByStaff
      ? `${record!.uploadedByStaff.firstName}` : 'System',
  };
}

// ─── PATCH /insurance/claims/:id/decision ────────────────────────────────────

export async function updateClaimDecision(
  userId: string,
  claimId: string,
  body: {
    status: ClaimStatus;
    approvedAmount?: number;
    notes?: string;
    settlementDate?: string;
  },
) {
  const provider = await prisma.insuranceProvider.findUnique({ where: { userId } });
  if (!provider) httpError('Insurance provider profile not found', 404);

  const claim = await prisma.insuranceClaim.findUnique({ where: { id: claimId } });
  if (!claim) httpError('Claim not found', 404);
  if (claim!.insuranceProviderId !== provider!.id)
    httpError('You do not have access to this claim', 403);

  // Validate transition
  const allowed = VALID_TRANSITIONS[claim!.status];
  if (!allowed.includes(body.status)) {
    httpError(
      `Cannot transition from ${claim!.status} to ${body.status}`,
      422,
      'INVALID_TRANSITION',
    );
  }

  // Validate approved amount
  if (body.status === ClaimStatus.APPROVED) {
    if (!body.approvedAmount) httpError('approvedAmount is required when approving', 422);
    if (body.approvedAmount! > claim!.claimedAmount) {
      httpError('Approved amount cannot exceed claimed amount', 422, 'AMOUNT_EXCEEDS_CLAIM');
    }
  }

  const updated = await prisma.insuranceClaim.update({
    where: { id: claimId },
    data: {
      status:         body.status,
      approvedAmount: body.approvedAmount,
      notes:          body.notes,
      settlementDate: body.settlementDate ? new Date(body.settlementDate) : undefined,
    },
  });

  await writeAuditLog({
    actorId:   userId,
    actorRole: 'INSURANCE_PROVIDER',
    targetId:  claimId,
    action:    AuditAction.CLAIM_DECISION,
    severity:  AuditSeverity.MEDIUM,
    details:   { from: claim!.status, to: body.status, approvedAmount: body.approvedAmount },
  });

  return updated;
}

// ─── GET /insurance/claims — List claims ─────────────────────────────────────

export async function listClaims(
  userId: string,
  query: {
    status?: ClaimStatus;
    claimType?: ClaimType;
    riskLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  },
) {
  const provider = await prisma.insuranceProvider.findUnique({ where: { userId } });
  if (!provider) httpError('Insurance provider profile not found', 404);

  const page  = query.page  ?? 1;
  const limit = query.limit ?? 20;
  const skip  = (page - 1) * limit;

  // Map riskLevel to fraudScore ranges
  let fraudScoreFilter: { gte?: number; lte?: number } | undefined;
  if (query.riskLevel) {
    const ranges: Record<string, { gte: number; lte: number }> = {
      LOW:      { gte: 0,  lte: 25  },
      MODERATE: { gte: 26, lte: 50  },
      HIGH:     { gte: 51, lte: 75  },
      CRITICAL: { gte: 76, lte: 100 },
    };
    fraudScoreFilter = ranges[query.riskLevel];
  }

  const where = {
    insuranceProviderId: provider!.id,
    ...(query.status    ? { status:    query.status }    : {}),
    ...(query.claimType ? { claimType: query.claimType } : {}),
    ...(fraudScoreFilter ? { fraudScore: fraudScoreFilter } : {}),
    ...(query.from || query.to ? {
      createdAt: {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to   ? { lte: new Date(query.to)   } : {}),
      },
    } : {}),
  };

  const [claims, total] = await Promise.all([
    prisma.insuranceClaim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        patient: { select: { uhid: true, firstName: true, lastName: true } },
      },
    }),
    prisma.insuranceClaim.count({ where }),
  ]);

  const riskLevel = (score: number | null) => {
    if (score === null) return null;
    if (score <= 25)  return 'LOW';
    if (score <= 50)  return 'MODERATE';
    if (score <= 75)  return 'HIGH';
    return 'CRITICAL';
  };

  return {
    claims: claims.map((c) => ({
      id:            c.id,
      claimNumber:   c.claimNumber,
      patientUhid:   c.patient.uhid,
      patientName:   `${c.patient.firstName} ${c.patient.lastName}`,
      claimType:     c.claimType,
      status:        c.status,
      claimedAmount: c.claimedAmount,
      approvedAmount:c.approvedAmount,
      fraudScore:    c.fraudScore,
      riskLevel:     riskLevel(c.fraudScore),
      createdAt:     c.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── GET /insurance/claims/:id — Full claim detail ───────────────────────────

export async function getClaimDetail(userId: string, claimId: string) {
  const provider = await prisma.insuranceProvider.findUnique({ where: { userId } });
  if (!provider) httpError('Insurance provider profile not found', 404);

  const claim = await prisma.insuranceClaim.findUnique({
    where: { id: claimId },
    include: {
      patient: { select: { uhid: true, firstName: true, lastName: true } },
      documents: true,
    },
  });
  if (!claim) httpError('Claim not found', 404);
  if (claim!.insuranceProviderId !== provider!.id)
    httpError('You do not have access to this claim', 403);

  const riskLevel = (() => {
    const s = claim!.fraudScore;
    if (s === null || s === undefined) return null;
    if (s <= 25)  return 'LOW';
    if (s <= 50)  return 'MODERATE';
    if (s <= 75)  return 'HIGH';
    return 'CRITICAL';
  })();

  // Fetch recent audit logs for this claim
  const auditLogs = await prisma.auditLog.findMany({
    where: { targetId: claimId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return {
    ...claim,
    patientUhid:  claim!.patient.uhid,
    patientName:  `${claim!.patient.firstName} ${claim!.patient.lastName}`,
    riskLevel,
    fraudFlags:   (claim!.fraudFlags as string[]) ?? [],
    auditLogs,
  };
}
