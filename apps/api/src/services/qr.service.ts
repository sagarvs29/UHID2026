import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import {
  QrScanType,
  EmergencyAccessType,
  AuditAction,
  AuditSeverity,
  ConsentScope,
} from '@prisma/client';

const EMERGENCY_SECRET = process.env.EMERGENCY_SECRET ?? 'emergency-secret-change-in-production';
const QR_RATE_LIMIT    = 5;    // max scans per QR per hour
const SOS_RATE_LIMIT   = 1;    // SOS per 10 minutes
const QR_LOCK_MS       = 60 * 60 * 1000;         // 1 hour lock
const SOS_COOLDOWN_MS  = 10 * 60 * 1000;          // 10 min cooldown
const TIER2_TTL_HOURS  = 2;
const OVERRIDE_TTL_HOURS = 4;
const ROTATION_HOURS   = 24;   // emergency card auto-rotates every 24h

// ─── Helpers ─────────────────────────────────────────────────────────────────

function httpError(message: string, statusCode: number, code?: string): never {
  const err = new Error(message) as Error & { statusCode: number; code?: string };
  err.statusCode = statusCode;
  if (code) err.code = code;
  throw err;
}

/** Generate a short alphanumeric emergency code like "EMG-4X9R" */
function generateEmergencyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `EMG-${code}`;
}

/** Check if the time is between 2 AM – 5 AM (suspicious window) */
function isNightHours(): boolean {
  const hour = new Date().getHours();
  return hour >= 2 && hour < 5;
}

/** Hash IP for privacy */
function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip + 'uhid-ip-salt').digest('hex').slice(0, 16);
}

/** Count scans for a QR in the past hour */
async function countRecentScans(qrCodeId: string): Promise<number> {
  return prisma.qrScanLog.count({
    where: {
      qrCodeId,
      scannedAt: { gte: new Date(Date.now() - QR_LOCK_MS) },
    },
  });
}

// ─── Audit log helper ─────────────────────────────────────────────────────────
async function writeAuditLog(params: {
  actorId: string;
  actorRole: string;
  targetId?: string;
  action: AuditAction;
  severity?: AuditSeverity;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId:    params.actorId,
        actorRole:  params.actorRole as import('@prisma/client').Role,
        action:     params.action,
        severity:   params.severity ?? AuditSeverity.LOW,
        targetId:   params.targetId   ?? null,
        targetType: params.targetId   ? 'Patient' : null,
        metadata:   params.details  ?? {},
        ipAddress:  params.ipAddress,
      },
    });
  } catch (err) {
    logger.warn('Failed to write audit log', { err });
  }
}

// ─── 1. GET /qr/emergency/:uhid — Tier 1 (public, no auth) ───────────────────

export async function getPublicEmergencyData(
  uhid: string,
  ipAddress?: string,
  location?: string,
) {
  // Find patient by UHID
  const patient = await prisma.patient.findUnique({
    where: { uhid },
    select: {
      id:               true,
      uhid:             true,
      bloodGroup:       true,
      allergies:        true,
      emergencyContacts: {
        take: 1,
        orderBy: { createdAt: 'asc' },
        select: { name: true, relation: true, phone: true },
      },
      qrCodes: {
        where: { isEmergencyCard: true, isRevoked: false },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, expiresAt: true },
      },
    },
  });

  if (!patient) httpError('Patient not found', 404);

  const qrCode = patient!.qrCodes[0];
  if (!qrCode) httpError('No emergency QR found for this patient', 404);

  // Check rate limit
  const recentCount = await countRecentScans(qrCode.id);
  if (recentCount >= QR_RATE_LIMIT) {
    // Log as suspicious
    await prisma.qrScanLog.create({
      data: {
        qrCodeId:       qrCode.id,
        patientId:      patient!.id,
        tier:           1,
        scanType:       QrScanType.SUSPICIOUS_SCAN,
        ipAddress:      ipAddress ? hashIp(ipAddress) : null,
        location,
        isSuspicious:   true,
        suspicionReason: 'RATE_LIMIT_EXCEEDED',
      },
    });
    httpError('QR rate limited — too many scans', 429, 'QR_RATE_LIMITED');
  }

  // Detect suspicious patterns
  const isSuspicious = isNightHours() || recentCount >= 3;
  const suspicionReason = isNightHours() ? 'NIGHT_HOURS_SCAN' : undefined;

  // Log the public scan
  await prisma.qrScanLog.create({
    data: {
      qrCodeId:       qrCode.id,
      patientId:      patient!.id,
      tier:           1,
      scanType:       QrScanType.PUBLIC_SCAN,
      ipAddress:      ipAddress ? hashIp(ipAddress) : null,
      location,
      isSuspicious,
      suspicionReason: suspicionReason ?? null,
    },
  });

  // Write audit
  await writeAuditLog({
    actorId:   patient!.id,
    actorRole: 'PATIENT',
    targetId:  patient!.id,
    action:    AuditAction.QR_USED,
    severity:  isSuspicious ? AuditSeverity.MEDIUM : AuditSeverity.LOW,
    details:   { tier: 1, scanType: 'PUBLIC_SCAN', location },
    ipAddress,
  });

  const contact = patient!.emergencyContacts[0];

  return {
    uhid:              patient!.uhid,
    bloodGroup:        patient!.bloodGroup,
    hasCriticalAllergy: patient!.allergies.length > 0,
    emergencyContact:  contact
      ? { name: contact.name, relation: contact.relation, phone: contact.phone }
      : null,
    scannedAt: new Date().toISOString(),
  };
}

// ─── 2. POST /qr/scan/doctor — Tier 2 (verified UHID doctor) ─────────────────

export async function doctorScanQr(
  doctorUserId: string,
  qrToken: string,
  ipAddress?: string,
  location?: string,
) {
  // Verify the JWT
  let payload: { uhid?: string; jti?: string; tier?: number };
  try {
    payload = jwt.verify(qrToken, EMERGENCY_SECRET) as typeof payload;
  } catch {
    httpError('Invalid or expired QR token', 400, 'QR_EXPIRED');
  }

  const { uhid, jti } = payload!;
  if (!uhid || !jti) httpError('Malformed QR token', 400, 'QR_INVALID');

  // Find the QR record
  const qrCode = await prisma.qrCode.findUnique({
    where: { jti },
    select: { id: true, patientId: true, isRevoked: true, isOneTime: true, usedAt: true, expiresAt: true },
  });

  if (!qrCode) httpError('QR code not found', 400, 'QR_INVALID');
  if (qrCode!.isRevoked) httpError('This QR has been revoked', 400, 'QR_REVOKED');
  if (qrCode!.isOneTime && qrCode!.usedAt) httpError('This one-time QR has already been used', 400, 'QR_USED');
  if (new Date() > qrCode!.expiresAt) httpError('This QR has expired', 400, 'QR_EXPIRED');

  // Rate limit check
  const recentCount = await countRecentScans(qrCode!.id);
  if (recentCount >= QR_RATE_LIMIT) {
    httpError('QR rate limited — too many scans', 429, 'QR_RATE_LIMITED');
  }

  // Get doctor info
  const doctor = await prisma.doctor.findUnique({
    where: { userId: doctorUserId },
    select: {
      id:        true,
      firstName: true,
      lastName:  true,
      specialty: true,
      isVerified: true,
      hospital:  { select: { id: true, name: true } },
      user:      { select: { id: true } },
    },
  });

  if (!doctor) httpError('Doctor profile not found', 404);
  if (!doctor!.isVerified) httpError('Only verified UHID doctors can access Tier 2 data', 403);

  // Get patient full clinical data
  const patient = await prisma.patient.findUnique({
    where: { id: qrCode!.patientId },
    select: {
      id:               true,
      uhid:             true,
      firstName:        true,
      lastName:         true,
      dateOfBirth:      true,
      bloodGroup:       true,
      allergies:        true,
      chronicConditions: true,
      emergencyContacts: {
        select: { name: true, relation: true, phone: true },
      },
      prescriptions: {
        where: { validUntil: { gte: new Date() } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          items: {
            select: { drugName: true, dosage: true, frequency: true },
          },
        },
      },
      clinicalNotes: {
        where: { visibility: { not: 'PRIVATE' } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { icd10Code: true, icd10Description: true, diagnosis: true, createdAt: true },
      },
    },
  });

  if (!patient) httpError('Patient not found', 404);

  // Mark one-time QR as used
  if (qrCode!.isOneTime) {
    await prisma.qrCode.update({
      where: { id: qrCode!.id },
      data:  { usedAt: new Date(), usedByDoctorId: doctor!.id },
    });
  }

  // Log the doctor scan
  await prisma.qrScanLog.create({
    data: {
      qrCodeId:      qrCode!.id,
      patientId:     patient!.id,
      tier:          2,
      scanType:      QrScanType.DOCTOR_SCAN,
      scannedById:   doctor!.user.id,
      scannerName:   `Dr. ${doctor!.firstName} ${doctor!.lastName}`,
      scannerUhidId: `DR-${doctor!.id.slice(-6).toUpperCase()}`,
      organization:  doctor!.hospital.name,
      ipAddress:     ipAddress ? hashIp(ipAddress) : null,
      location,
      isSuspicious:  isNightHours(),
      suspicionReason: isNightHours() ? 'NIGHT_HOURS_SCAN' : null,
    },
  });

  await writeAuditLog({
    actorId:   doctor!.user.id,
    actorRole: 'DOCTOR',
    targetId:  patient!.id,
    action:    AuditAction.QR_USED,
    severity:  AuditSeverity.MEDIUM,
    details:   { tier: 2, scanType: 'DOCTOR_SCAN', doctorId: doctor!.id },
    ipAddress,
  });

  const age = Math.floor(
    (Date.now() - new Date(patient!.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  const currentMedications = patient!.prescriptions.flatMap((p) =>
    p.items.map((item) => ({
      name: item.drugName,
      dose: item.dosage,
      frequency: item.frequency,
    }))
  );

  const accessExpiresAt = new Date(Date.now() + TIER2_TTL_HOURS * 60 * 60 * 1000).toISOString();

  return {
    uhid:              patient!.uhid,
    name:              `${patient!.firstName} ${patient!.lastName}`,
    age,
    bloodGroup:        patient!.bloodGroup,
    allergies:         patient!.allergies.map((a) => ({ name: a, reaction: '', severity: 'UNKNOWN' })),
    currentMedications,
    chronicConditions: patient!.chronicConditions,
    pastSurgeries:     patient!.clinicalNotes.map((n) => `${n.icd10Description} (${n.createdAt.toISOString().slice(0, 7)})`),
    emergencyContacts: patient!.emergencyContacts,
    accessExpiresAt,
  };
}

// ─── 3. POST /qr/generate — Tier 3 one-time patient share ────────────────────

export async function generateOneTimeQr(
  patientUserId: string,
  scope: ConsentScope[],
  durationMinutes: number,
  label?: string,
) {
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUserId },
    select: { id: true, uhid: true },
  });
  if (!patient) httpError('Patient profile not found', 404);

  const jti       = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  const token = jwt.sign(
    { uhid: patient!.uhid, jti, tier: 3, isOneTime: true },
    EMERGENCY_SECRET,
    { expiresIn: `${durationMinutes}m`, jwtid: jti },
  );

  const qrCode = await prisma.qrCode.create({
    data: {
      patientId:      patient!.id,
      jti,
      scope,
      tier:           3,
      isOneTime:      true,
      isEmergencyCard: false,
      label:          label ?? null,
      expiresAt,
    },
  });

  await writeAuditLog({
    actorId:   patientUserId,
    actorRole: 'PATIENT',
    targetId:  patient!.id,
    action:    AuditAction.QR_GENERATED,
    severity:  AuditSeverity.LOW,
    details:   { qrId: qrCode.id, tier: 3, durationMinutes, scope },
  });

  return {
    qrId:      qrCode.id,
    qrToken:   token,
    qrImageUrl: null as null, // QR image generation would require a qrcode library; return token for now
    expiresAt: expiresAt.toISOString(),
    isOneTime: true,
  };
}

// ─── 4. GET /qr/scan-logs — patient views their scan history ─────────────────

export async function getScanLogs(patientUserId: string) {
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUserId },
    select: { id: true },
  });
  if (!patient) httpError('Patient profile not found', 404);

  const logs = await prisma.qrScanLog.findMany({
    where: { patientId: patient!.id },
    orderBy: { scannedAt: 'desc' },
    take: 100,
    select: {
      id:               true,
      tier:             true,
      scanType:         true,
      scannerName:      true,
      scannerUhidId:    true,
      organization:     true,
      location:         true,
      isSuspicious:     true,
      suspicionReason:  true,
      reportedByPatient: true,
      scannedAt:        true,
    },
  });

  return logs;
}

// ─── 5. POST /qr/invalidate — patient invalidates all active QRs ─────────────

export async function invalidateQrs(patientUserId: string, reason: string) {
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUserId },
    select: { id: true, uhid: true },
  });
  if (!patient) httpError('Patient profile not found', 404);

  // Revoke all active QR codes
  const result = await prisma.qrCode.updateMany({
    where: { patientId: patient!.id, isRevoked: false },
    data:  { isRevoked: true, revokedAt: new Date(), revokedReason: reason },
  });

  // Generate a new emergency card
  const jti       = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ROTATION_HOURS * 60 * 60 * 1000);
  jwt.sign(
    { uhid: patient!.uhid, jti, tier: 1, isEmergencyCard: true },
    EMERGENCY_SECRET,
    { expiresIn: `${ROTATION_HOURS}h`, jwtid: jti },
  );

  await prisma.qrCode.create({
    data: {
      patientId:       patient!.id,
      jti,
      scope:           ['ALL'] as ConsentScope[],
      tier:            1,
      isEmergencyCard: true,
      expiresAt,
    },
  });

  await writeAuditLog({
    actorId:   patientUserId,
    actorRole: 'PATIENT',
    targetId:  patient!.id,
    action:    AuditAction.QR_REVOKED,
    severity:  AuditSeverity.MEDIUM,
    details:   { invalidatedCount: result.count, reason },
  });

  return {
    invalidatedCount:    result.count,
    newQrGeneratedAt:    new Date().toISOString(),
  };
}

// ─── 6. POST /qr/sos — patient activates SOS ─────────────────────────────────

export async function activateSos(
  patientUserId: string,
  latitude: number,
  longitude: number,
  message?: string,
  ipAddress?: string,
) {
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUserId },
    select: {
      id:               true,
      firstName:        true,
      lastName:         true,
      emergencyContacts: {
        select: { name: true, phone: true, isOnUhid: true },
      },
    },
  });
  if (!patient) httpError('Patient profile not found', 404);

  // SOS rate limit: 1 per 10 minutes
  const recentSos = await prisma.emergencyAccess.count({
    where: {
      patientId:  patient!.id,
      accessType: EmergencyAccessType.SOS,
      createdAt:  { gte: new Date(Date.now() - SOS_COOLDOWN_MS) },
    },
  });
  if (recentSos > 0) {
    httpError('SOS rate limit: please wait before activating again', 429, 'SOS_RATE_LIMITED');
  }

  const emergencyCode    = generateEmergencyCode();
  const codeExpiresAt    = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const accessExpiresAt  = new Date(Date.now() + 2 * 60 * 60 * 1000);

  const sosRecord = await prisma.emergencyAccess.create({
    data: {
      patientId:              patient!.id,
      accessType:             EmergencyAccessType.SOS,
      reason:                 message ?? 'SOS activated',
      latitude,
      longitude,
      emergencyCode,
      emergencyCodeExpiresAt: codeExpiresAt,
      expiresAt:              accessExpiresAt,
      isActive:               true,
    },
  });

  await writeAuditLog({
    actorId:   patientUserId,
    actorRole: 'PATIENT',
    targetId:  patient!.id,
    action:    AuditAction.SOS_ACTIVATED,
    severity:  AuditSeverity.HIGH,
    details:   { sosId: sosRecord.id, latitude, longitude, emergencyCode },
    ipAddress,
  });

  logger.warn('SOS ACTIVATED', {
    patientId: patient!.id,
    name: `${patient!.firstName} ${patient!.lastName}`,
    lat: latitude,
    lng: longitude,
    code: emergencyCode,
  });

  return {
    sosId:                sosRecord.id,
    emergencyCode,
    emergencyCodeExpiresAt: codeExpiresAt.toISOString(),
    notifiedContacts:     patient!.emergencyContacts.length,
    notifiedHospitals:    3, // Would query by Haversine in production
  };
}

// ─── 7. POST /emergency/override — doctor emergency override ──────────────────

export async function emergencyOverride(
  doctorUserId: string,
  patientUhid: string,
  reasonType: string,
  reason: string,
  acknowledgement: boolean,
  ipAddress?: string,
) {
  if (!acknowledgement) httpError('Acknowledgement required', 400);

  const doctor = await prisma.doctor.findUnique({
    where: { userId: doctorUserId },
    select: {
      id:        true,
      firstName: true,
      lastName:  true,
      isVerified: true,
      hospital:  { select: { id: true, name: true } },
      user:      { select: { id: true } },
    },
  });
  if (!doctor) httpError('Doctor profile not found', 404);
  if (!doctor!.isVerified) httpError('Only verified doctors can use emergency override', 403);

  const patient = await prisma.patient.findUnique({
    where: { uhid: patientUhid },
    select: { id: true },
  });
  if (!patient) httpError('Patient not found', 404);

  const expiresAt = new Date(Date.now() + OVERRIDE_TTL_HOURS * 60 * 60 * 1000);

  const access = await prisma.emergencyAccess.create({
    data: {
      patientId:          patient!.id,
      accessedByDoctorId: doctor!.id,
      accessType:         EmergencyAccessType.OVERRIDE,
      reason,
      reasonType,
      expiresAt,
      isActive:           true,
    },
  });

  await writeAuditLog({
    actorId:   doctor!.user.id,
    actorRole: 'DOCTOR',
    targetId:  patient!.id,
    action:    AuditAction.EMERGENCY_OVERRIDE,
    severity:  AuditSeverity.HIGH,
    details: {
      accessId:   access.id,
      reasonType,
      reason,
      hospital:   doctor!.hospital.name,
      doctorName: `Dr. ${doctor!.firstName} ${doctor!.lastName}`,
    },
    ipAddress,
  });

  logger.warn('EMERGENCY OVERRIDE', {
    doctorId:  doctor!.id,
    patientId: patient!.id,
    reasonType,
  });

  return {
    accessGranted: true,
    expiresAt:     expiresAt.toISOString(),
    auditLogId:    access.id,
  };
}

// ─── 8. Ensure emergency QR exists for patient (called post-registration) ─────

export async function ensureEmergencyQr(patientUserId: string): Promise<void> {
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUserId },
    select: {
      id:   true,
      uhid: true,
      qrCodes: {
        where: { isEmergencyCard: true, isRevoked: false },
        take:  1,
        select: { id: true },
      },
    },
  });
  if (!patient) return;
  if (patient.qrCodes.length > 0) return;

  const jti       = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ROTATION_HOURS * 60 * 60 * 1000);
  jwt.sign(
    { uhid: patient.uhid, jti, tier: 1, isEmergencyCard: true },
    EMERGENCY_SECRET,
    { expiresIn: `${ROTATION_HOURS}h`, jwtid: jti },
  );

  await prisma.qrCode.create({
    data: {
      patientId:       patient.id,
      jti,
      scope:           ['ALL'] as ConsentScope[],
      tier:            1,
      isEmergencyCard: true,
      expiresAt,
    },
  });

  logger.info(`Emergency QR created for patient ${patient.id}`);
}
