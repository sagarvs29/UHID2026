/**
 * admin.service.test.ts
 * Unit tests for admin.service functions.
 * Prisma is fully mocked.
 */

import { verifyStaff, deactivateStaff, getAuditLogs } from '@/services/admin.service';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

// ─── Mock prisma ─────────────────────────────────────────────────────────────
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    hospitalAdmin: { findUnique: jest.fn() },
    user:          { findUnique: jest.fn(), update: jest.fn() },
    doctor:        { findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    hospitalStaff: { findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    auditLog:      { create: jest.fn().mockResolvedValue({}), findMany: jest.fn(), count: jest.fn() },
    medicalRecord: { groupBy: jest.fn(), count: jest.fn() },
    prescription:  { count: jest.fn() },
    consent:       { count: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const ADMIN_USER_ID  = 'admin_user_001';
const TARGET_USER_ID = 'doctor_user_001';
const HOSPITAL_ID    = 'hosp_001';

function mockAdminProfile() {
  (mockPrisma.hospitalAdmin.findUnique as jest.Mock).mockResolvedValue({
    userId: ADMIN_USER_ID, hospitalId: HOSPITAL_ID,
    firstName: 'Admin', lastName: 'Test',
  });
}

describe('verifyStaff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminProfile();
  });

  it('sets isVerified=true for a DOCTOR', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'DOCTOR' });
    const doctor = { id: 'doc_001', userId: TARGET_USER_ID, hospitalId: HOSPITAL_ID };
    (mockPrisma.doctor.findFirst as jest.Mock).mockResolvedValue(doctor);
    (mockPrisma.doctor.update as jest.Mock).mockResolvedValue({ ...doctor, isVerified: true });

    const result = await verifyStaff(ADMIN_USER_ID, TARGET_USER_ID, 'VERIFY');

    expect(mockPrisma.doctor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isVerified: true }),
      }),
    );
    expect(result.action).toBe('VERIFY');
  });

  it('sets isVerified=false for REJECT action', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'DOCTOR' });
    const doctor = { id: 'doc_001', userId: TARGET_USER_ID, hospitalId: HOSPITAL_ID };
    (mockPrisma.doctor.findFirst as jest.Mock).mockResolvedValue(doctor);
    (mockPrisma.doctor.update as jest.Mock).mockResolvedValue({ ...doctor, isVerified: false });

    const result = await verifyStaff(ADMIN_USER_ID, TARGET_USER_ID, 'REJECT', 'Not eligible');

    expect(mockPrisma.doctor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isVerified: false }),
      }),
    );
    expect(result.action).toBe('REJECT');
  });

  it('creates an audit log entry', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'DOCTOR' });
    const doctor = { id: 'doc_001', userId: TARGET_USER_ID, hospitalId: HOSPITAL_ID };
    (mockPrisma.doctor.findFirst as jest.Mock).mockResolvedValue(doctor);
    (mockPrisma.doctor.update as jest.Mock).mockResolvedValue(doctor);

    await verifyStaff(ADMIN_USER_ID, TARGET_USER_ID, 'VERIFY');

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'STAFF_VERIFIED' }),
      }),
    );
  });

  it('throws 403 when doctor belongs to a different hospital', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'DOCTOR' });
    // Doctor not found for this hospitalId
    (mockPrisma.doctor.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      verifyStaff(ADMIN_USER_ID, TARGET_USER_ID, 'VERIFY')
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 404 when user not found', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      verifyStaff(ADMIN_USER_ID, 'nonexistent_user', 'VERIFY')
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('deactivateStaff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminProfile();
  });

  it('sets isActive=false on the user', async () => {
    const staff = { id: 'staff_001', userId: TARGET_USER_ID, hospitalId: HOSPITAL_ID };
    (mockPrisma.doctor.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.hospitalStaff.findFirst as jest.Mock).mockResolvedValue(staff);
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({ isActive: false });

    await deactivateStaff(ADMIN_USER_ID, TARGET_USER_ID, 'Misconduct');

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TARGET_USER_ID },
        data:  { isActive: false },
      }),
    );
  });

  it('throws 403 when staff belongs to a different hospital', async () => {
    (mockPrisma.doctor.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.hospitalStaff.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      deactivateStaff(ADMIN_USER_ID, 'other_user', 'Test')
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('creates a STAFF_DEACTIVATED audit log', async () => {
    const doctor = { id: 'doc_001', userId: TARGET_USER_ID, hospitalId: HOSPITAL_ID };
    (mockPrisma.doctor.findFirst as jest.Mock).mockResolvedValue(doctor);
    (mockPrisma.hospitalStaff.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({ isActive: false });

    await deactivateStaff(ADMIN_USER_ID, TARGET_USER_ID, 'Reason');

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'STAFF_DEACTIVATED' }),
      }),
    );
  });
});

describe('getAuditLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminProfile();
  });

  it('returns paginated audit logs', async () => {
    const fakeLogs = Array.from({ length: 5 }, (_, i) => ({
      id: `log_${i}`, actorId: ADMIN_USER_ID, action: 'LOGIN',
      severity: 'LOW', createdAt: new Date(),
    }));
    (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue(fakeLogs);
    (mockPrisma.auditLog.count as jest.Mock).mockResolvedValue(5);

    const result = await getAuditLogs(ADMIN_USER_ID, Role.HOSPITAL_ADMIN, {
      page: 1, limit: 10,
    });

    expect(result.logs).toHaveLength(5);
    expect(result.total).toBe(5);
  });
});
