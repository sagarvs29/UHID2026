/**
 * auth.service.test.ts
 * Unit tests for auth.service functions.
 * Prisma and external libs (argon2, redis, email, JWT) are mocked.
 */

import {
  registerPatient,
  loginUser,
  refreshTokens,
  logout,
} from '@/services/auth.service';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { generateUHID } from '@/lib/crypto';
import argon2 from 'argon2';

// ─── Mock prisma ─────────────────────────────────────────────────────────────
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user:            { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    patient:         { findUnique: jest.fn(), create: jest.fn() },
    doctor:          { findUnique: jest.fn() },
    hospitalStaff:   { findUnique: jest.fn() },
    hospitalAdmin:   { findUnique: jest.fn() },
    insuranceProvider: { findUnique: jest.fn() },
    superAdmin:      { findUnique: jest.fn() },
    auditLog:        { create: jest.fn().mockResolvedValue({}) },
    $transaction:    jest.fn(),
  },
}));

// ─── Mock redis ──────────────────────────────────────────────────────────────
jest.mock('@/lib/redis', () => ({
  redis: {
    setex: jest.fn().mockResolvedValue('OK'),
    get:   jest.fn(),
    del:   jest.fn().mockResolvedValue(1),
  },
  TTL: { REFRESH_TOKEN: 604800, BLACKLIST: 900 },
}));

// ─── Mock email helpers ───────────────────────────────────────────────────────
jest.mock('@/lib/email', () => ({
  sendEmailVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomePatientEmail:    jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail:     jest.fn().mockResolvedValue(undefined),
  sendApprovalPendingEmail:   jest.fn().mockResolvedValue(undefined),
}));

// ─── Mock logger ─────────────────────────────────────────────────────────────
jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ─── Typed mocks ─────────────────────────────────────────────────────────────
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRedis  = redis as jest.Mocked<typeof redis>;

// ─── UHID format test ────────────────────────────────────────────────────────
describe('generateUHID', () => {
  it('generates UHID matching expected format', () => {
    const uhid = generateUHID();
    // Format: UH-XXXXXX where X is a digit (100000–999999)
    expect(uhid).toMatch(/^UH-\d{6}$/);
  });

  it('generates unique UHIDs across 100 iterations', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateUHID()));
    expect(ids.size).toBe(100);
  });
});

// ─── registerPatient ─────────────────────────────────────────────────────────
describe('registerPatient', () => {
  const validInput = {
    email:             'rohan@test.com',
    password:          'SecurePass@123',
    confirmPassword:   'SecurePass@123',
    firstName:         'Rohan',
    lastName:          'Mehta',
    dateOfBirth:       '1995-06-15',
    gender:            'MALE' as const,
    bloodGroup:        'UNKNOWN' as const,
    phone:             '9876543210',
    allergies:         [] as string[],
    chronicConditions: [] as string[],
  };

  const fakeUser = {
    id: 'user_001', email: validInput.email, role: 'PATIENT',
    isEmailVerified: false, isActive: true, passwordHash: 'hash',
    emailVerifyToken: 'token', createdAt: new Date(), updatedAt: new Date(),
  };
  const fakePatient = {
    id: 'pat_001', userId: 'user_001', uhid: 'UHID-ABCD-EFGH-IJKL',
    firstName: 'Rohan', lastName: 'Mehta', dateOfBirth: new Date('1995-06-15'),
    gender: 'MALE', bloodGroup: 'UNKNOWN', phone: null, allergies: [],
    chronicConditions: [], createdAt: new Date(), updatedAt: new Date(),
    photoUrl: null, emergencyContact: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // No existing user
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    // No existing patient with same UHID
    (mockPrisma.patient.findUnique as jest.Mock).mockResolvedValue(null);
    // Transaction creates both user and patient
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        user:    { create: jest.fn().mockResolvedValue(fakeUser) },
        patient: { create: jest.fn().mockResolvedValue(fakePatient) },
      })
    );
    mockRedis.setex.mockResolvedValue('OK');
  });

  it('creates a patient and returns tokens + profile', async () => {
    const result = await registerPatient(validInput);

    expect(result.user.email).toBe(validInput.email);
    expect(result.user.role).toBe('PATIENT');
    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
    expect(result.profile).toHaveProperty('uhid');
    expect(result.requiresEmailVerification).toBe(true);
  });

  it('throws 409 when email already exists', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(fakeUser);

    await expect(registerPatient(validInput)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('stores refresh token in Redis after registration', async () => {
    await registerPatient(validInput);
    expect(mockRedis.setex).toHaveBeenCalledWith(
      expect.stringMatching(/^refresh:/),
      expect.any(Number),
      expect.any(String),
    );
  });
});

// ─── loginUser ───────────────────────────────────────────────────────────────
describe('loginUser', () => {
  const password = 'SecurePass@123';

  async function makeHashedUser() {
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id, memoryCost: 1024, timeCost: 2, parallelism: 1,
    });
    return {
      id: 'user_001', email: 'test@test.com', passwordHash,
      role: 'PATIENT', isEmailVerified: true, isActive: true,
    };
  }

  it('returns tokens on correct credentials', async () => {
    jest.clearAllMocks();
    const fakeUser = await makeHashedUser();
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(fakeUser);
    (mockPrisma.patient.findUnique as jest.Mock).mockResolvedValue({
      id: 'pat_001', uhid: 'UHID-TEST-TEST-TEST', userId: fakeUser.id,
      firstName: 'Test', lastName: 'User', dateOfBirth: new Date('1990-01-01'),
      gender: 'MALE', bloodGroup: 'UNKNOWN', phone: null, photoUrl: null,
      allergies: [], chronicConditions: [], emergencyContact: null,
      createdAt: new Date(), updatedAt: new Date(),
    });
    mockRedis.setex.mockResolvedValue('OK');
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const result = await loginUser({ email: 'test@test.com', password });
    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
  });

  it('throws 401 for wrong password', async () => {
    jest.clearAllMocks();
    const fakeUser = await makeHashedUser();
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(fakeUser);

    await expect(
      loginUser({ email: 'test@test.com', password: 'WrongPassword!' })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 401 when user not found', async () => {
    jest.clearAllMocks();
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      loginUser({ email: 'nobody@test.com', password: 'any' })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 403 when account is deactivated', async () => {
    jest.clearAllMocks();
    const fakeUser = await makeHashedUser();
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ ...fakeUser, isActive: false });

    await expect(
      loginUser({ email: 'test@test.com', password })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns requiresEmailVerification=true for unverified email', async () => {
    jest.clearAllMocks();
    const fakeUser = await makeHashedUser();
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...fakeUser, isEmailVerified: false,
    });
    (mockPrisma.patient.findUnique as jest.Mock).mockResolvedValue({
      id: 'pat_001', uhid: 'UHID-TEST-0001-0001', userId: fakeUser.id,
      firstName: 'A', lastName: 'B', dateOfBirth: new Date('1990-01-01'),
      gender: 'MALE', bloodGroup: 'UNKNOWN', phone: null, photoUrl: null,
      allergies: [], chronicConditions: [], emergencyContact: null,
      createdAt: new Date(), updatedAt: new Date(),
    });
    mockRedis.setex.mockResolvedValue('OK');
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const result = await loginUser({ email: 'test@test.com', password });
    expect(result.requiresEmailVerification).toBe(true);
  });
});

// ─── refreshTokens ────────────────────────────────────────────────────────────
describe('refreshTokens', () => {
  it('throws 401 for an invalid refresh token string', async () => {
    await expect(refreshTokens('bad.token.here')).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('throws 401 when token not found in Redis (revoked)', async () => {
    // Sign a valid refresh token
    const { signRefreshToken } = await import('@/lib/jwt');
    const token = signRefreshToken({ userId: 'u1', sessionId: 's1' });

    (mockRedis.get as jest.Mock).mockResolvedValue(null); // not in Redis

    await expect(refreshTokens(token)).rejects.toMatchObject({ statusCode: 401 });
  });
});

// ─── logout ──────────────────────────────────────────────────────────────────
describe('logout', () => {
  it('deletes refresh token from Redis and blacklists access token', async () => {
    jest.clearAllMocks();
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const { signAccessToken } = await import('@/lib/jwt');
    const accessToken = signAccessToken({ userId: 'u1', role: 'PATIENT', sessionId: 's1' });

    await logout('u1', 's1', accessToken, 'PATIENT' as any);

    expect(mockRedis.del).toHaveBeenCalledWith('refresh:u1:s1');
    expect(mockRedis.setex).toHaveBeenCalledWith(
      `blacklist:${accessToken}`,
      expect.any(Number),
      '1',
    );
  });
});
