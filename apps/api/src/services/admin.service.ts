import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import {
  AuditAction,
  AuditSeverity,
  Role,
} from '@prisma/client';
import type { AuditLogQuery } from '@/validators/admin.validator';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function httpError(message: string, statusCode: number, code?: string): never {
  const err = new Error(message) as Error & { statusCode: number; code?: string };
  err.statusCode = statusCode;
  if (code) err.code = code;
  throw err;
}

async function writeAuditLog(params: {
  actorId:    string;
  actorRole:  Role;
  action:     AuditAction;
  severity:   AuditSeverity;
  targetId?:  string;
  targetType?: string;
  hospitalId?: string;
  metadata?:  Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({ data: {
      actorId:    params.actorId,
      actorRole:  params.actorRole,
      action:     params.action,
      severity:   params.severity,
      targetId:   params.targetId   ?? null,
      targetType: params.targetType ?? null,
      hospitalId: params.hospitalId ?? null,
      metadata:   params.metadata   ?? null,
    }});
  } catch (e) {
    logger.error('Audit log write failed', e);
  }
}

// ─── Resolve hospital admin's hospitalId ─────────────────────────────────────

async function getAdminHospitalId(userId: string): Promise<string> {
  const admin = await prisma.hospitalAdmin.findUnique({
    where: { userId },
    select: { hospitalId: true },
  });
  if (!admin) httpError('Admin profile not found', 404);
  return admin!.hospitalId;
}

// ─── Pending verifications ───────────────────────────────────────────────────

export async function getPendingVerifications(userId: string) {
  const hospitalId = await getAdminHospitalId(userId);

  const [doctors, staff] = await Promise.all([
    prisma.doctor.findMany({
      where:   { hospitalId, isVerified: false },
      select:  {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        specialty: true,
        licenseNumber: true,
        createdAt: true,
      },
    }),
    prisma.hospitalStaff.findMany({
      where:   { hospitalId, isVerified: false },
      select:  {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        staffType: true,
        employeeId: true,
        createdAt: true,
      },
    }),
  ]);

  const pendingDoctors = doctors.map((d) => ({
    id:             d.userId,
    profileId:      d.id,
    name:           `Dr. ${d.firstName} ${d.lastName}`,
    role:           'DOCTOR' as const,
    specialty:      d.specialty,
    licenseNumber:  d.licenseNumber,
    registeredAt:   d.createdAt.toISOString(),
  }));

  const pendingStaff = staff.map((s) => ({
    id:           s.userId,
    profileId:    s.id,
    name:         `${s.firstName} ${s.lastName}`,
    role:         'HOSPITAL_STAFF' as const,
    staffType:    s.staffType,
    employeeId:   s.employeeId ?? null,
    registeredAt: s.createdAt.toISOString(),
  }));

  return [...pendingDoctors, ...pendingStaff];
}

// ─── Verify / Reject staff ───────────────────────────────────────────────────

export async function verifyStaff(
  actorUserId: string,
  targetUserId: string,
  action: 'VERIFY' | 'REJECT' | 'REQUEST_MORE_INFO',
  notes?: string,
) {
  const hospitalId = await getAdminHospitalId(actorUserId);

  // Determine target type
  const user = await prisma.user.findUnique({
    where:  { id: targetUserId },
    select: { role: true },
  });
  if (!user) httpError('User not found', 404);

  const isVerified = action === 'VERIFY';
  let profileId: string | null = null;

  if (user!.role === 'DOCTOR') {
    const doctor = await prisma.doctor.findFirst({
      where: { userId: targetUserId, hospitalId },
    });
    if (!doctor) httpError('Doctor not found in your hospital', 403);
    await prisma.doctor.update({
      where: { id: doctor!.id },
      data:  {
        isVerified,
        verifiedAt:       isVerified ? new Date() : null,
        verifiedByAdminId: actorUserId,
      },
    });
    profileId = doctor!.id;
  } else if (user!.role === 'HOSPITAL_STAFF') {
    const staff = await prisma.hospitalStaff.findFirst({
      where: { userId: targetUserId, hospitalId },
    });
    if (!staff) httpError('Staff not found in your hospital', 403);
    await prisma.hospitalStaff.update({
      where: { id: staff!.id },
      data:  { isVerified },
    });
    profileId = staff!.id;
  } else {
    httpError('User is not a doctor or staff member', 400);
  }

  const auditAction = action === 'VERIFY'
    ? AuditAction.STAFF_VERIFIED
    : AuditAction.STAFF_REJECTED;

  await writeAuditLog({
    actorId:    actorUserId,
    actorRole:  Role.HOSPITAL_ADMIN,
    action:     auditAction,
    severity:   AuditSeverity.MEDIUM,
    targetId:   targetUserId,
    targetType: 'User',
    hospitalId,
    metadata:   { action, notes, profileId },
  });

  return { success: true, action, targetUserId };
}

// ─── Deactivate staff ────────────────────────────────────────────────────────

export async function deactivateStaff(
  actorUserId: string,
  targetUserId: string,
  reason: string,
) {
  const hospitalId = await getAdminHospitalId(actorUserId);

  // Make sure they belong to same hospital
  const [doctor, staff] = await Promise.all([
    prisma.doctor.findFirst({ where: { userId: targetUserId, hospitalId } }),
    prisma.hospitalStaff.findFirst({ where: { userId: targetUserId, hospitalId } }),
  ]);
  if (!doctor && !staff) httpError('Staff not found in your hospital', 403);

  await prisma.user.update({
    where: { id: targetUserId },
    data:  { isActive: false },
  });

  await writeAuditLog({
    actorId:    actorUserId,
    actorRole:  Role.HOSPITAL_ADMIN,
    action:     AuditAction.STAFF_DEACTIVATED,
    severity:   AuditSeverity.HIGH,
    targetId:   targetUserId,
    targetType: 'User',
    hospitalId,
    metadata:   { reason },
  });

  return { success: true, targetUserId, message: 'Staff deactivated' };
}

// ─── Active staff list ───────────────────────────────────────────────────────

export async function getActiveStaff(userId: string) {
  const hospitalId = await getAdminHospitalId(userId);

  const [doctors, staff] = await Promise.all([
    prisma.doctor.findMany({
      where:  { hospitalId, isVerified: true, user: { isActive: true } },
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        specialty: true,
        licenseNumber: true,
        verifiedAt: true,
        user: { select: { email: true, isActive: true } },
      },
    }),
    prisma.hospitalStaff.findMany({
      where:  { hospitalId, isVerified: true, user: { isActive: true } },
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        staffType: true,
        employeeId: true,
        user: { select: { email: true, isActive: true } },
      },
    }),
  ]);

  return {
    doctors: doctors.map((d) => ({
      userId:       d.userId,
      name:         `Dr. ${d.firstName} ${d.lastName}`,
      role:         'DOCTOR',
      specialty:    d.specialty,
      licenseNumber: d.licenseNumber,
      email:        d.user.email,
      verifiedAt:   d.verifiedAt?.toISOString() ?? null,
    })),
    staff: staff.map((s) => ({
      userId:    s.userId,
      name:      `${s.firstName} ${s.lastName}`,
      role:      'HOSPITAL_STAFF',
      staffType: s.staffType,
      email:     s.user.email,
      employeeId: s.employeeId ?? null,
    })),
  };
}

// ─── Hospital analytics ───────────────────────────────────────────────────────

export async function getHospitalAnalytics(userId: string) {
  const hospitalId = await getAdminHospitalId(userId);

  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1); // start of month

  const [
    totalPatients,
    recordsThisMonth,
    prescriptionsThisMonth,
    pendingConsents,
    emergencyOverridesThisMonth,
    aiReportsThisMonth,
    recordsPerDay,
  ] = await Promise.all([
    // Total patients registered at this hospital (via their records or consents)
    prisma.medicalRecord.groupBy({
      by:    ['patientId'],
      where: { hospitalId },
      _count: true,
    }).then((r) => r.length),

    prisma.medicalRecord.count({
      where: { hospitalId, createdAt: { gte: start } },
    }),

    prisma.prescription.count({
      where: { doctor: { hospitalId }, createdAt: { gte: start } },
    }),

    prisma.consent.count({
      where: {
        grantedToDoctor: { hospitalId },
        status: 'PENDING',
      },
    }),

    prisma.auditLog.count({
      where: { hospitalId, action: AuditAction.EMERGENCY_OVERRIDE, createdAt: { gte: start } },
    }),

    prisma.auditLog.count({
      where: {
        hospitalId,
        action: { in: [AuditAction.AI_REPORT_GENERATED, AuditAction.AI_SUMMARY_GENERATED] },
        createdAt: { gte: start },
      },
    }),

    // Records per day last 30 days
    (async () => {
      const days30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const records = await prisma.medicalRecord.findMany({
        where:  { hospitalId, createdAt: { gte: days30 } },
        select: { createdAt: true },
      });
      const byDay: Record<string, number> = {};
      for (const r of records) {
        const day = r.createdAt.toISOString().split('T')[0];
        byDay[day] = (byDay[day] ?? 0) + 1;
      }
      return Object.entries(byDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    })(),
  ]);

  return {
    totalPatients,
    recordsUploadedThisMonth:      recordsThisMonth,
    prescriptionsIssuedThisMonth:  prescriptionsThisMonth,
    pendingConsents,
    emergencyOverridesThisMonth,
    aiReportsThisMonth,
    trends: { recordsPerDay },
  };
}

// ─── Audit logs ───────────────────────────────────────────────────────────────

export async function getAuditLogs(
  userId:    string,
  actorRole: Role,
  query:     AuditLogQuery,
) {
  // Hospital admin: scope to own hospital; super admin: can specify or see all
  let hospitalId: string | undefined;
  if (actorRole === Role.HOSPITAL_ADMIN) {
    hospitalId = await getAdminHospitalId(userId);
  } else if (query.hospitalId) {
    hospitalId = query.hospitalId;
  }

  const where: Parameters<typeof prisma.auditLog.findMany>[0]['where'] = {};

  if (hospitalId)    where.hospitalId = hospitalId;
  if (query.action)  where.action     = query.action as AuditAction;
  if (query.severity) where.severity  = query.severity as AuditSeverity;
  if (query.actorRole) where.actorRole = query.actorRole as Role;

  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
    if (query.dateTo)   where.createdAt.lte = new Date(query.dateTo);
  }

  if (query.search) {
    where.OR = [
      { actorId:    { contains: query.search, mode: 'insensitive' } },
      { targetId:   { contains: query.search, mode: 'insensitive' } },
      { ipAddress:  { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take:    query.limit,
      skip,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    total,
    page:       query.page,
    limit:      query.limit,
    totalPages: Math.ceil(total / query.limit),
    logs,
  };
}

// ─── Audit logs CSV export ────────────────────────────────────────────────────

export async function exportAuditLogsCsv(
  userId:    string,
  actorRole: Role,
  query:     AuditLogQuery,
): Promise<string> {
  // Re-use same filter logic but max 50k rows
  let hospitalId: string | undefined;
  if (actorRole === Role.HOSPITAL_ADMIN) {
    hospitalId = await getAdminHospitalId(userId);
  } else if (query.hospitalId) {
    hospitalId = query.hospitalId;
  }

  const where: Parameters<typeof prisma.auditLog.findMany>[0]['where'] = {};
  if (hospitalId)    where.hospitalId = hospitalId;
  if (query.action)  where.action     = query.action as AuditAction;
  if (query.severity) where.severity  = query.severity as AuditSeverity;
  if (query.actorRole) where.actorRole = query.actorRole as Role;
  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
    if (query.dateTo)   where.createdAt.lte = new Date(query.dateTo);
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take:    50_000,
  });

  // Log the export itself
  await writeAuditLog({
    actorId:   userId,
    actorRole,
    action:    AuditAction.RECORD_VIEWED, // closest available action
    severity:  AuditSeverity.MEDIUM,
    metadata:  { exportedRows: logs.length, filters: query },
  });

  const header = 'id,action,severity,actorId,actorRole,targetId,targetType,hospitalId,ipAddress,createdAt';
  const rows = logs.map((l) =>
    [
      l.id,
      l.action,
      l.severity,
      l.actorId,
      l.actorRole,
      l.targetId  ?? '',
      l.targetType ?? '',
      l.hospitalId ?? '',
      l.ipAddress  ?? '',
      l.createdAt.toISOString(),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );

  return [header, ...rows].join('\n');
}

// ─── Super admin: hospital list ───────────────────────────────────────────────

export async function listHospitals() {
  const hospitals = await prisma.hospital.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      isVerified: true,
      verifiedAt: true,
      isNABH: true,
      registrationNumber: true,
      createdAt: true,
      admin: {
        select: {
          firstName: true,
          lastName: true,
          user: { select: { email: true } },
        },
      },
      _count: { select: { doctors: true, staff: true } },
    },
  });

  return hospitals.map((h) => ({
    id:                 h.id,
    name:               h.name,
    city:               h.city,
    state:              h.state,
    isVerified:         h.isVerified,
    verifiedAt:         h.verifiedAt?.toISOString() ?? null,
    isNABH:             h.isNABH,
    registrationNumber: h.registrationNumber,
    createdAt:          h.createdAt.toISOString(),
    adminName:          h.admin ? `${h.admin.firstName} ${h.admin.lastName}` : null,
    adminEmail:         h.admin?.user.email ?? null,
    doctorCount:        h._count.doctors,
    staffCount:         h._count.staff,
  }));
}

// ─── Super admin: hospital action ────────────────────────────────────────────

export async function hospitalAction(
  actorUserId: string,
  hospitalId:  string,
  action:      'VERIFY' | 'SUSPEND',
  notes?:      string,
) {
  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
  if (!hospital) httpError('Hospital not found', 404);

  await prisma.hospital.update({
    where: { id: hospitalId },
    data:  {
      isVerified: action === 'VERIFY',
      verifiedAt: action === 'VERIFY' ? new Date() : null,
    },
  });

  await writeAuditLog({
    actorId:   actorUserId,
    actorRole: Role.SUPER_ADMIN,
    action:    action === 'VERIFY' ? AuditAction.HOSPITAL_VERIFIED : AuditAction.HOSPITAL_SUSPENDED,
    severity:  AuditSeverity.HIGH,
    targetId:  hospitalId,
    targetType: 'Hospital',
    metadata:  { action, notes },
  });

  return { success: true, hospitalId, action };
}

// ─── Super admin: platform analytics ─────────────────────────────────────────

export async function getPlatformAnalytics() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    userCounts,
    totalRecords,
    activeConsents,
    claimsBreakdown,
    sosEvents,
    aiUsage,
  ] = await Promise.all([
    prisma.user.groupBy({
      by:     ['role'],
      _count: { id: true },
    }),

    prisma.medicalRecord.count(),

    prisma.consent.count({ where: { status: 'ACTIVE' } }),

    prisma.insuranceClaim.groupBy({
      by:     ['status'],
      _count: { id: true },
    }),

    prisma.auditLog.count({
      where: { action: AuditAction.SOS_ACTIVATED, createdAt: { gte: start } },
    }),

    prisma.auditLog.count({
      where: {
        action: { in: [AuditAction.AI_REPORT_GENERATED, AuditAction.AI_SUMMARY_GENERATED] },
        createdAt: { gte: start },
      },
    }),
  ]);

  const byRole: Record<string, number> = {};
  for (const r of userCounts) byRole[r.role] = r._count.id;

  const claimsByStatus: Record<string, number> = {};
  for (const c of claimsBreakdown) claimsByStatus[c.status] = c._count.id;

  return {
    users:         { total: Object.values(byRole).reduce((a, b) => a + b, 0), byRole },
    totalRecords,
    activeConsents,
    claims:        { total: Object.values(claimsByStatus).reduce((a, b) => a + b, 0), byStatus: claimsByStatus },
    sosEventsThisMonth: sosEvents,
    aiUsageThisMonth:   aiUsage,
  };
}
