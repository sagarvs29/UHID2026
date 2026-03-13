import prisma from '@/lib/prisma';
import { redis, TTL } from '@/lib/redis';
import { getIO } from '@/lib/socket';
import { sendConsentOtpEmail, sendConsentStatusEmail } from '@/lib/email';
import { RequestConsentInput } from '@/validators/consent.validator';
import logger from '@/lib/logger';
import { Role, ConsentScope } from '@prisma/client';

// ─── Local error helper ───────────────────────────────────────────────────────
function httpError(message: string, statusCode: number): never {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  throw err;
}

// ─── Redis key helpers ────────────────────────────────────────────────────────
const otpKey      = (id: string) => `otp:consent:${id}`;
const attemptsKey = (id: string) => `otp:consent:${id}:attempts`;
const lockKey     = (id: string) => `otp:consent:${id}:lock`;

const OTP_TTL      = TTL.OTP;   // 10 min
const LOCK_TTL     = 5 * 60;    // 5 min
const MAX_ATTEMPTS = 3;

// ─── Notification expiry helper (24h from now) ────────────────────────────────
const notifExpiry = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

function generateOtp(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

// ─── REQUEST CONSENT ─────────────────────────────────────────────────────────
export async function requestConsent(
  requestorUserId: string,
  requestorRole: 'DOCTOR' | 'INSURANCE_PROVIDER',
  input: RequestConsentInput
) {
  let doctorId: string | null = null;
  let insuranceProviderId: string | null = null;
  let requesterName = '';

  if (requestorRole === 'DOCTOR') {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: requestorUserId },
      select: { id: true, firstName: true, lastName: true, isVerified: true },
    });
    if (!doctor) httpError('Doctor profile not found', 404);
    if (!doctor!.isVerified) httpError('Your doctor profile is not yet verified. Only verified doctors can request consent.', 403);
    doctorId = doctor!.id;
    requesterName = `Dr. ${doctor!.firstName} ${doctor!.lastName}`;
  } else {
    const ins = await prisma.insuranceProvider.findUnique({
      where: { userId: requestorUserId },
      select: { id: true, companyName: true, isVerified: true },
    });
    if (!ins) httpError('Insurance provider profile not found', 404);
    if (!ins!.isVerified) httpError('Your insurance provider account is not yet verified.', 403);
    insuranceProviderId = ins!.id;
    requesterName = ins!.companyName;
  }

  // Resolve patient
  const patient = await prisma.patient.findUnique({
    where: { uhid: input.patientUhid },
    select: { id: true, firstName: true, lastName: true, userId: true },
  });
  if (!patient) httpError('Patient not found with this UHID', 404);

  // Duplicate pending check
  const existing = await prisma.consent.findFirst({
    where: {
      patientId: patient!.id,
      status: 'PENDING',
      ...(doctorId ? { doctorId } : { insuranceProviderId }),
    },
  });
  if (existing) httpError('A pending consent request already exists for this patient.', 409);

  // Calculate expiry (if isTemporary and durationHours provided)
  let expiresAt: Date | null = null;
  if (input.isTemporary && input.durationHours) {
    expiresAt = new Date(Date.now() + input.durationHours * 60 * 60 * 1000);
  }

  const consent = await prisma.consent.create({
    data: {
      patientId: patient!.id,
      grantedToType: requestorRole === 'DOCTOR' ? 'DOCTOR' : 'INSURANCE_PROVIDER',
      doctorId,
      insuranceProviderId,
      scope: input.scope as ConsentScope[],
      purpose: input.purpose,
      isTemporary: input.isTemporary,
      durationHours: input.durationHours ?? null,
      expiresAt,
      status: 'PENDING',
    },
  });

  // Audit log (non-blocking)
  prisma.auditLog.create({
    data: {
      action: 'CONSENT_REQUESTED',
      actorId: requestorUserId,
      actorRole: requestorRole as Role,
      severity: 'MEDIUM',
      targetId: patient!.id,
      targetType: 'Patient',
      metadata: { consentId: consent.id, patientUhid: input.patientUhid, scope: input.scope },
    },
  }).catch(() => {});

  // In-app notification to patient
  prisma.notification.create({
    data: {
      userId: patient!.userId,
      type: 'CONSENT_REQUEST',
      title: `${requesterName} is requesting access to your records`,
      message: `Purpose: ${input.purpose}`,
      metadata: { consentId: consent.id, requesterName, scope: input.scope },
      expiresAt: notifExpiry(),
    },
  }).catch(() => {});

  // Real-time socket event to patient
  try {
    getIO().to(`user:${patient!.userId}`).emit('consent:request', {
      consentId: consent.id,
      requestedBy: { type: requestorRole, name: requesterName },
      scope: input.scope,
      purpose: input.purpose,
      requestedAt: consent.requestedAt,
    });
  } catch (e) {
    logger.warn('[Consent] Socket emit failed (non-fatal): ' + String(e));
  }

  return { consentId: consent.id, status: 'PENDING', requestedAt: consent.requestedAt };
}

// ─── SEND OTP ─────────────────────────────────────────────────────────────────
export async function sendConsentOtp(patientUserId: string, consentId: string) {
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUserId },
    select: { id: true, firstName: true, lastName: true, user: { select: { email: true } } },
  });
  if (!patient) httpError('Patient profile not found', 404);

  const consent = await prisma.consent.findUnique({
    where: { id: consentId },
    include: {
      doctor: { select: { firstName: true, lastName: true } },
      insuranceProvider: { select: { companyName: true } },
    },
  });
  if (!consent) httpError('Consent request not found', 404);
  if (consent.patientId !== patient!.id) httpError('This consent does not belong to you', 403);
  if (consent.status !== 'PENDING') httpError(`Cannot send OTP for consent in status: ${consent.status}`, 400);

  // Lockout check
  const locked = await redis.get(lockKey(consentId));
  if (locked) {
    const ttl = await redis.ttl(lockKey(consentId));
    httpError(`Too many wrong attempts. Try again in ${Math.ceil(ttl / 60)} minute(s).`, 429);
  }

  const otp = generateOtp();
  await redis.set(otpKey(consentId), otp, 'EX', OTP_TTL);
  await redis.del(attemptsKey(consentId));

  const requesterName = consent.doctor
    ? `Dr. ${consent.doctor.firstName} ${consent.doctor.lastName}`
    : consent.insuranceProvider?.companyName ?? 'Unknown';

  sendConsentOtpEmail(
    patient!.user.email,
    `${patient!.firstName} ${patient!.lastName}`,
    otp,
    requesterName,
    consent.grantedToType,
    consent.scope
  ).catch((e) => logger.error('[Consent OTP Email] ' + String(e)));

  logger.info(`[Consent] OTP sent for ${consentId}`);
  return { message: 'OTP sent to your registered email address', expiresInMinutes: 10 };
}

// ─── APPROVE CONSENT ─────────────────────────────────────────────────────────
export async function approveConsent(patientUserId: string, consentId: string, otp: string) {
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUserId },
    select: { id: true, firstName: true, lastName: true, uhid: true },
  });
  if (!patient) httpError('Patient profile not found', 404);

  const consent = await prisma.consent.findUnique({
    where: { id: consentId },
    include: {
      doctor: { select: { firstName: true, lastName: true, userId: true, user: { select: { email: true } } } },
      insuranceProvider: { select: { companyName: true, userId: true, user: { select: { email: true } } } },
    },
  });
  if (!consent) httpError('Consent request not found', 404);
  if (consent.patientId !== patient!.id) httpError('This consent does not belong to you', 403);
  if (consent.status !== 'PENDING') httpError(`Consent is already in status: ${consent.status}`, 400);

  // Lock check
  const locked = await redis.get(lockKey(consentId));
  if (locked) {
    const ttl = await redis.ttl(lockKey(consentId));
    httpError(`Locked due to too many wrong attempts. Try again in ${Math.ceil(ttl / 60)} minute(s).`, 429);
  }

  const storedOtp = await redis.get(otpKey(consentId));
  if (!storedOtp) httpError('OTP has expired. Please request a new OTP.', 400);

  if (storedOtp !== otp) {
    const attempts = await redis.incr(attemptsKey(consentId));
    const remaining = MAX_ATTEMPTS - attempts;
    if (attempts >= MAX_ATTEMPTS) {
      await redis.set(lockKey(consentId), '1', 'EX', LOCK_TTL);
      await redis.del(otpKey(consentId));
      await redis.del(attemptsKey(consentId));
      httpError('Too many wrong attempts. Locked for 5 minutes.', 429);
    }
    httpError(`Incorrect OTP. ${remaining} attempt(s) remaining.`, 400);
  }

  await redis.del(otpKey(consentId));
  await redis.del(attemptsKey(consentId));

  const now = new Date();
  let expiresAt: Date | null = consent.expiresAt;
  if (consent.isTemporary && consent.durationHours && !expiresAt) {
    expiresAt = new Date(now.getTime() + consent.durationHours * 60 * 60 * 1000);
  }

  const updated = await prisma.consent.update({
    where: { id: consentId },
    data: { status: 'ACTIVE', grantedAt: now, expiresAt, otpVerified: true, otpVerifiedAt: now },
  });

  prisma.auditLog.create({
    data: {
      action: 'CONSENT_APPROVED',
      actorId: patientUserId,
      actorRole: 'PATIENT' as Role,
      severity: 'MEDIUM',
      targetId: consentId,
      targetType: 'Consent',
      metadata: { scope: consent.scope, expiresAt },
    },
  }).catch(() => {});

  const requesterName = consent.doctor
    ? `Dr. ${consent.doctor.firstName} ${consent.doctor.lastName}`
    : consent.insuranceProvider?.companyName ?? 'Unknown';
  const patientName = `${patient!.firstName} ${patient!.lastName}`;
  const requesterUserId = consent.doctor?.userId ?? consent.insuranceProvider?.userId;

  // Socket to requester
  try {
    if (requesterUserId) {
      getIO().to(`user:${requesterUserId}`).emit('consent:approved', {
        consentId,
        patientUhid: patient!.uhid,
        expiresAt: updated.expiresAt,
        scope: consent.scope,
      });
    }
  } catch (e) { logger.warn('[Consent] Socket emit failed: ' + String(e)); }

  // Email to requester
  const requesterEmail = consent.doctor?.user.email ?? consent.insuranceProvider?.user.email;
  if (requesterEmail) {
    sendConsentStatusEmail(requesterEmail, requesterName, 'APPROVED', patientName, updated.expiresAt)
      .catch((e) => logger.error('[Consent Email] ' + String(e)));
  }

  // In-app notification to requester
  if (requesterUserId) {
    prisma.notification.create({
      data: {
        userId: requesterUserId,
        type: 'CONSENT_APPROVED',
        title: `${patientName} approved your access request`,
        message: expiresAt ? `Access valid until ${expiresAt.toUTCString()}` : 'Permanent access granted',
        metadata: { consentId, scope: consent.scope },
        expiresAt: notifExpiry(),
      },
    }).catch(() => {});
  }

  return { consentId, status: 'ACTIVE', expiresAt: updated.expiresAt, grantedTo: requesterName };
}

// ─── DENY CONSENT ─────────────────────────────────────────────────────────────
export async function denyConsent(patientUserId: string, consentId: string) {
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUserId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!patient) httpError('Patient profile not found', 404);

  const consent = await prisma.consent.findUnique({
    where: { id: consentId },
    include: {
      doctor: { select: { firstName: true, lastName: true, userId: true, user: { select: { email: true } } } },
      insuranceProvider: { select: { companyName: true, userId: true, user: { select: { email: true } } } },
    },
  });
  if (!consent) httpError('Consent request not found', 404);
  if (consent.patientId !== patient!.id) httpError('This consent does not belong to you', 403);
  if (consent.status !== 'PENDING') httpError(`Consent is already in status: ${consent.status}`, 400);

  await prisma.consent.update({ where: { id: consentId }, data: { status: 'DENIED' } });
  await redis.del(otpKey(consentId));
  await redis.del(attemptsKey(consentId));

  prisma.auditLog.create({
    data: {
      action: 'CONSENT_DENIED',
      actorId: patientUserId,
      actorRole: 'PATIENT' as Role,
      severity: 'MEDIUM',
      targetId: consentId,
      targetType: 'Consent',
      metadata: {},
    },
  }).catch(() => {});

  const requesterName = consent.doctor
    ? `Dr. ${consent.doctor.firstName} ${consent.doctor.lastName}`
    : consent.insuranceProvider?.companyName ?? 'Unknown';
  const patientName = `${patient!.firstName} ${patient!.lastName}`;
  const requesterUserId = consent.doctor?.userId ?? consent.insuranceProvider?.userId;

  try {
    if (requesterUserId) {
      getIO().to(`user:${requesterUserId}`).emit('consent:denied', {
        consentId,
        message: 'Patient has denied the access request.',
      });
    }
  } catch (e) { logger.warn('[Consent] Socket emit failed: ' + String(e)); }

  const requesterEmail = consent.doctor?.user.email ?? consent.insuranceProvider?.user.email;
  if (requesterEmail) {
    sendConsentStatusEmail(requesterEmail, requesterName, 'DENIED', patientName)
      .catch((e) => logger.error('[Consent Email] ' + String(e)));
  }

  if (requesterUserId) {
    prisma.notification.create({
      data: {
        userId: requesterUserId,
        type: 'CONSENT_DENIED',
        title: `${patientName} denied your access request`,
        message: 'Your request to access medical records was denied.',
        metadata: { consentId },
        expiresAt: notifExpiry(),
      },
    }).catch(() => {});
  }

  return { message: 'Access request denied.' };
}

// ─── REVOKE CONSENT ───────────────────────────────────────────────────────────
export async function revokeConsent(patientUserId: string, consentId: string) {
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUserId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!patient) httpError('Patient profile not found', 404);

  const consent = await prisma.consent.findUnique({
    where: { id: consentId },
    include: {
      doctor: { select: { firstName: true, lastName: true, userId: true, user: { select: { email: true } } } },
      insuranceProvider: { select: { companyName: true, userId: true, user: { select: { email: true } } } },
    },
  });
  if (!consent) httpError('Consent not found', 404);
  if (consent.patientId !== patient!.id) httpError('This consent does not belong to you', 403);
  if (consent.status !== 'ACTIVE') httpError(`Only ACTIVE consents can be revoked. Current: ${consent.status}`, 400);

  const now = new Date();
  await prisma.consent.update({ where: { id: consentId }, data: { status: 'REVOKED', revokedAt: now } });

  prisma.auditLog.create({
    data: {
      action: 'CONSENT_REVOKED',
      actorId: patientUserId,
      actorRole: 'PATIENT' as Role,
      severity: 'HIGH',
      targetId: consentId,
      targetType: 'Consent',
      metadata: { revokedAt: now },
    },
  }).catch(() => {});

  const requesterName = consent.doctor
    ? `Dr. ${consent.doctor.firstName} ${consent.doctor.lastName}`
    : consent.insuranceProvider?.companyName ?? 'Unknown';
  const patientName = `${patient!.firstName} ${patient!.lastName}`;
  const requesterUserId = consent.doctor?.userId ?? consent.insuranceProvider?.userId;

  try {
    if (requesterUserId) {
      getIO().to(`user:${requesterUserId}`).emit('consent:revoked', {
        consentId,
        message: 'Patient has revoked your access.',
        revokedAt: now,
      });
    }
  } catch (e) { logger.warn('[Consent] Socket emit failed: ' + String(e)); }

  const requesterEmail = consent.doctor?.user.email ?? consent.insuranceProvider?.user.email;
  if (requesterEmail) {
    sendConsentStatusEmail(requesterEmail, requesterName, 'REVOKED', patientName)
      .catch((e) => logger.error('[Consent Email] ' + String(e)));
  }

  if (requesterUserId) {
    prisma.notification.create({
      data: {
        userId: requesterUserId,
        type: 'CONSENT_REVOKED',
        title: `${patientName} revoked your record access`,
        message: 'You can no longer view their medical records.',
        metadata: { consentId, revokedAt: now },
        expiresAt: notifExpiry(),
      },
    }).catch(() => {});
  }

  return { revokedAt: now };
}

// ─── GET ACTIVE CONSENTS (patient) ───────────────────────────────────────────
export async function getActiveConsents(patientUserId: string) {
  const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, select: { id: true } });
  if (!patient) httpError('Patient profile not found', 404);

  const consents = await prisma.consent.findMany({
    where: { patientId: patient!.id, status: 'ACTIVE' },
    include: {
      doctor: { select: { firstName: true, lastName: true, specialty: true, hospital: { select: { name: true, city: true } } } },
      insuranceProvider: { select: { companyName: true } },
    },
    orderBy: { grantedAt: 'desc' },
  });

  return consents.map((c) => ({
    id: c.id,
    grantedToType: c.grantedToType,
    grantedTo: c.doctor
      ? { name: `Dr. ${c.doctor.firstName} ${c.doctor.lastName}`, hospital: `${c.doctor.hospital.name}, ${c.doctor.hospital.city}`, specialty: c.doctor.specialty }
      : { name: c.insuranceProvider?.companyName ?? 'Unknown' },
    scope: c.scope,
    purpose: c.purpose,
    isTemporary: c.isTemporary,
    expiresAt: c.expiresAt,
    grantedAt: c.grantedAt,
  }));
}

// ─── GET PENDING CONSENTS (patient) ──────────────────────────────────────────
export async function getPendingConsents(patientUserId: string) {
  const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, select: { id: true } });
  if (!patient) httpError('Patient profile not found', 404);

  const consents = await prisma.consent.findMany({
    where: { patientId: patient!.id, status: 'PENDING' },
    include: {
      doctor: { select: { firstName: true, lastName: true, specialty: true, hospital: { select: { name: true, city: true } } } },
      insuranceProvider: { select: { companyName: true } },
    },
    orderBy: { requestedAt: 'desc' },
  });

  return consents.map((c) => ({
    id: c.id,
    grantedToType: c.grantedToType,
    requestedBy: c.doctor
      ? { name: `Dr. ${c.doctor.firstName} ${c.doctor.lastName}`, hospital: `${c.doctor.hospital.name}, ${c.doctor.hospital.city}`, specialty: c.doctor.specialty }
      : { name: c.insuranceProvider?.companyName ?? 'Unknown' },
    scope: c.scope,
    purpose: c.purpose,
    isTemporary: c.isTemporary,
    durationHours: c.durationHours,
    requestedAt: c.requestedAt,
  }));
}

// ─── GET CONSENT HISTORY (patient) ───────────────────────────────────────────
export async function getConsentHistory(patientUserId: string, page: number, limit: number) {
  const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, select: { id: true } });
  if (!patient) httpError('Patient profile not found', 404);

  const [total, consents] = await Promise.all([
    prisma.consent.count({ where: { patientId: patient!.id } }),
    prisma.consent.findMany({
      where: { patientId: patient!.id },
      include: {
        doctor: { select: { firstName: true, lastName: true, specialty: true } },
        insuranceProvider: { select: { companyName: true } },
      },
      orderBy: { requestedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    consents: consents.map((c) => ({
      id: c.id,
      grantedToType: c.grantedToType,
      party: c.doctor
        ? `Dr. ${c.doctor.firstName} ${c.doctor.lastName} (${c.doctor.specialty})`
        : c.insuranceProvider?.companyName ?? 'Unknown',
      scope: c.scope,
      purpose: c.purpose,
      status: c.status,
      requestedAt: c.requestedAt,
      grantedAt: c.grantedAt,
      revokedAt: c.revokedAt,
      expiresAt: c.expiresAt,
    })),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

// ─── CHECK CONSENT (doctor/insurance checks own access) ──────────────────────
export async function checkConsent(
  requestorUserId: string,
  requestorRole: 'DOCTOR' | 'INSURANCE_PROVIDER',
  patientUhid: string
) {
  const patient = await prisma.patient.findUnique({ where: { uhid: patientUhid }, select: { id: true } });
  if (!patient) httpError('Patient not found', 404);

  let doctorId: string | null = null;
  let insuranceProviderId: string | null = null;

  if (requestorRole === 'DOCTOR') {
    const doctor = await prisma.doctor.findUnique({ where: { userId: requestorUserId }, select: { id: true } });
    if (!doctor) httpError('Doctor profile not found', 404);
    doctorId = doctor!.id;
  } else {
    const ins = await prisma.insuranceProvider.findUnique({ where: { userId: requestorUserId }, select: { id: true } });
    if (!ins) httpError('Insurance provider profile not found', 404);
    insuranceProviderId = ins!.id;
  }

  const consent = await prisma.consent.findFirst({
    where: {
      patientId: patient!.id,
      status: 'ACTIVE',
      ...(doctorId ? { doctorId } : { insuranceProviderId }),
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { grantedAt: 'desc' },
  });

  if (!consent) return { hasAccess: false };

  const msLeft = consent.expiresAt ? consent.expiresAt.getTime() - Date.now() : null;
  const expiresIn = msLeft !== null
    ? msLeft < 3_600_000 ? `${Math.ceil(msLeft / 60_000)} minutes` : `${Math.ceil(msLeft / 3_600_000)} hours`
    : 'Permanent';

  return { hasAccess: true, consentId: consent.id, scope: consent.scope, expiresAt: consent.expiresAt, expiresIn };
}

// ─── EXPIRE STALE CONSENTS (cron) ────────────────────────────────────────────
export async function expireStaleConsents(): Promise<number> {
  const now = new Date();
  const stale = await prisma.consent.findMany({
    where: { status: 'ACTIVE', expiresAt: { lt: now } },
    select: {
      id: true,
      patientId: true,
      doctor: { select: { userId: true } },
      insuranceProvider: { select: { userId: true } },
    },
  });

  if (stale.length === 0) return 0;

  await prisma.consent.updateMany({
    where: { id: { in: stale.map((c) => c.id) }, status: 'ACTIVE', expiresAt: { lt: now } },
    data: { status: 'EXPIRED' },
  });

  for (const c of stale) {
    prisma.auditLog.create({
      data: {
        action: 'CONSENT_EXPIRED',
        actorId: 'system',
        actorRole: 'SUPER_ADMIN' as Role, // system action uses SUPER_ADMIN as a proxy
        severity: 'LOW',
        targetId: c.id,
        targetType: 'Consent',
        metadata: { expiredAt: now },
      },
    }).catch(() => {});

    const requesterUserId = c.doctor?.userId ?? c.insuranceProvider?.userId;
    try {
      if (requesterUserId) {
        getIO().to(`user:${requesterUserId}`).emit('consent:expired', {
          consentId: c.id,
          message: 'Your access to patient records has expired.',
        });
      }
    } catch { /* non-fatal */ }
  }

  logger.info(`[Consent Cron] Expired ${stale.length} consent(s)`);
  return stale.length;
}
