/**
 * auth.service.ts
 * All Phase 1 authentication business logic.
 *
 * Key rules:
 * - NO demo data / NO pre-fills — every field is real
 * - User model: id, email, passwordHash, role, isEmailVerified, emailVerifyToken, isActive
 * - Role profiles are SEPARATE models (Patient, Doctor, HospitalStaff, InsuranceProvider, SuperAdmin)
 * - UHID lives on Patient model, NOT on User
 * - Doctor/Staff → isVerified=false until Hospital Admin approves
 * - InsuranceProvider → isVerified=false until Super Admin approves
 */
import argon2 from 'argon2';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { redis, TTL } from '@/lib/redis';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/jwt';
import { generateUHID, encrypt } from '@/lib/crypto';
import {
  sendEmailVerificationEmail,
  sendWelcomePatientEmail,
  sendPasswordResetEmail,
  sendApprovalPendingEmail,
} from '@/lib/email';
import logger from '@/lib/logger';
import { Role, BloodGroup, Gender, StaffType } from '@prisma/client';
import type {
  LoginInput,
  PatientRegisterInput,
  DoctorRegisterInput,
  StaffRegisterInput,
  InsuranceRegisterInput,
} from '@/validators/auth.validator';

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface BaseAuthResult {
  user: {
    id: string;
    email: string;
    role: Role;
    isEmailVerified: boolean;
    isActive: boolean;
  };
  tokens: TokenPair;
  profile: Record<string, unknown>;
  requiresApproval?: boolean;
  requiresEmailVerification: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ARGON2 CONFIG — memory-hard, secure
// ─────────────────────────────────────────────────────────────────────────────
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 1,
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hash a password with Argon2id.
 */
async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Issue access + refresh token pair and store refresh token in Redis.
 */
async function createTokenPair(userId: string, role: string): Promise<TokenPair> {
  const sessionId = uuidv4();
  const accessToken = signAccessToken({ userId, role, sessionId });
  const refreshToken = signRefreshToken({ userId, sessionId });

  await redis.setex(
    `refresh:${userId}:${sessionId}`,
    TTL.REFRESH_TOKEN,
    refreshToken
  );

  return { accessToken, refreshToken };
}

/**
 * Generate a cryptographically secure email verification token (hex string).
 */
function generateEmailToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Throw a typed HTTP error.
 */
function httpError(message: string, statusCode: number): never {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  throw err;
}

/**
 * Collision-safe UHID generation — retries up to 10 times.
 */
async function generateCollisionFreeUHID(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const uhid = generateUHID();
    const exists = await prisma.patient.findUnique({ where: { uhid } });
    if (!exists) return uhid;
  }
  httpError('Could not generate unique UHID. Please try again.', 500);
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────
export async function registerPatient(data: PatientRegisterInput): Promise<BaseAuthResult> {
  // 1. Unique email check
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) httpError('This email is already registered', 409);

  // 2. Hash password
  const passwordHash = await hashPassword(data.password);

  // 3. Email verify token
  const emailVerifyToken = generateEmailToken();

  // 4. Generate collision-safe UHID
  const uhid = await generateCollisionFreeUHID();

  // 5. Create User + Patient in a transaction
  const { user, patient } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: Role.PATIENT,
        isEmailVerified: false,
        emailVerifyToken,
        isActive: true,
      },
    });

    const patient = await tx.patient.create({
      data: {
        userId: user.id,
        uhid,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender as Gender,
        bloodGroup: (data.bloodGroup as BloodGroup) ?? BloodGroup.UNKNOWN,
        phone: data.phone || null,
        allergies: data.allergies ?? [],
        chronicConditions: data.chronicConditions ?? [],
      },
    });

    return { user, patient };
  });

  // 6. Send verification email (non-blocking)
  sendEmailVerificationEmail(user.email, `${patient.firstName} ${patient.lastName}`, emailVerifyToken).catch(
    (e) => logger.warn('[Auth] Email verification send failed:', e)
  );

  // 7. Issue tokens
  const tokens = await createTokenPair(user.id, user.role);

  logger.info(`[Auth] Patient registered: ${user.id} | UHID: ${uhid}`);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: false,
      isActive: true,
    },
    tokens,
    profile: {
      uhid: patient.uhid,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      phone: patient.phone,
      allergies: patient.allergies,
      chronicConditions: patient.chronicConditions,
    },
    requiresEmailVerification: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────
export async function registerDoctor(data: DoctorRegisterInput): Promise<BaseAuthResult> {
  // 1. Unique email
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) httpError('This email is already registered', 409);

  // 2. Unique license number
  const existingLicense = await prisma.doctor.findUnique({
    where: { licenseNumber: data.licenseNumber },
  });
  if (existingLicense) httpError('This license number is already registered', 409);

  // 3. Verify hospital exists and is active
  const hospital = await prisma.hospital.findUnique({ where: { id: data.hospitalId } });
  if (!hospital) httpError('Hospital not found', 404);
  if (!hospital.isVerified) httpError('Selected hospital is not yet verified on UHID', 400);

  // 4. Hash + token
  const passwordHash = await hashPassword(data.password);
  const emailVerifyToken = generateEmailToken();

  // 5. Transaction: User + Doctor
  const { user, doctor } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: Role.DOCTOR,
        isEmailVerified: false,
        emailVerifyToken,
        isActive: true,
      },
    });

    const doctor = await tx.doctor.create({
      data: {
        userId: user.id,
        hospitalId: data.hospitalId,
        firstName: data.firstName,
        lastName: data.lastName,
        specialty: data.specialty,
        licenseNumber: data.licenseNumber,
        qualifications: data.qualifications,
        experienceYears: data.experienceYears,
        consultationFee: data.consultationFee ?? 0,
        availableForVideo: data.availableForVideo ?? true,
        availableForInPerson: data.availableForInPerson ?? true,
        languages: data.languages ?? ['English'],
        isVerified: false, // requires Hospital Admin approval
      },
    });

    return { user, doctor };
  });

  // 6. Emails (non-blocking)
  sendEmailVerificationEmail(user.email, `Dr. ${doctor.firstName} ${doctor.lastName}`, emailVerifyToken).catch(
    (e) => logger.warn('[Auth] Doctor verification email failed:', e)
  );
  sendApprovalPendingEmail(
    user.email,
    `Dr. ${doctor.firstName} ${doctor.lastName}`,
    'DOCTOR',
    hospital.name
  ).catch((e) => logger.warn('[Auth] Approval pending email failed:', e));

  const tokens = await createTokenPair(user.id, user.role);

  logger.info(`[Auth] Doctor registered (pending approval): ${user.id} | Hospital: ${hospital.name}`);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: false,
      isActive: true,
    },
    tokens,
    profile: {
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      specialty: doctor.specialty,
      licenseNumber: doctor.licenseNumber,
      hospitalId: doctor.hospitalId,
      hospitalName: hospital.name,
      isVerified: false,
    },
    requiresApproval: true,
    requiresEmailVerification: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HOSPITAL STAFF REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────
export async function registerStaff(data: StaffRegisterInput): Promise<BaseAuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) httpError('This email is already registered', 409);

  const hospital = await prisma.hospital.findUnique({ where: { id: data.hospitalId } });
  if (!hospital) httpError('Hospital not found', 404);
  if (!hospital.isVerified) httpError('Selected hospital is not yet verified on UHID', 400);

  const passwordHash = await hashPassword(data.password);
  const emailVerifyToken = generateEmailToken();

  const { user, staff } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: Role.HOSPITAL_STAFF,
        isEmailVerified: false,
        emailVerifyToken,
        isActive: true,
      },
    });

    const staff = await tx.hospitalStaff.create({
      data: {
        userId: user.id,
        hospitalId: data.hospitalId,
        firstName: data.firstName,
        lastName: data.lastName,
        staffType: data.staffType as StaffType,
        employeeId: data.employeeId || null,
        isVerified: false, // requires Hospital Admin approval
      },
    });

    return { user, staff };
  });

  sendEmailVerificationEmail(user.email, `${staff.firstName} ${staff.lastName}`, emailVerifyToken).catch(
    (e) => logger.warn('[Auth] Staff verification email failed:', e)
  );
  sendApprovalPendingEmail(
    user.email,
    `${staff.firstName} ${staff.lastName}`,
    'HOSPITAL_STAFF',
    hospital.name
  ).catch((e) => logger.warn('[Auth] Staff approval email failed:', e));

  const tokens = await createTokenPair(user.id, user.role);

  logger.info(`[Auth] Staff registered (pending approval): ${user.id} | ${data.staffType} at ${hospital.name}`);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: false,
      isActive: true,
    },
    tokens,
    profile: {
      firstName: staff.firstName,
      lastName: staff.lastName,
      staffType: staff.staffType,
      employeeId: staff.employeeId,
      hospitalId: staff.hospitalId,
      hospitalName: hospital.name,
      isVerified: false,
    },
    requiresApproval: true,
    requiresEmailVerification: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INSURANCE PROVIDER REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────
export async function registerInsuranceProvider(data: InsuranceRegisterInput): Promise<BaseAuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) httpError('This email is already registered', 409);

  const existingLicense = await prisma.insuranceProvider.findUnique({
    where: { licenseNumber: data.licenseNumber },
  });
  if (existingLicense) httpError('This IRDAI license number is already registered', 409);

  const passwordHash = await hashPassword(data.password);
  const emailVerifyToken = generateEmailToken();

  const { user, provider } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: Role.INSURANCE_PROVIDER,
        isEmailVerified: false,
        emailVerifyToken,
        isActive: true,
      },
    });

    const provider = await tx.insuranceProvider.create({
      data: {
        userId: user.id,
        companyName: data.companyName,
        licenseNumber: data.licenseNumber,
        isVerified: false, // requires Super Admin approval
      },
    });

    return { user, provider };
  });

  sendEmailVerificationEmail(user.email, provider.companyName, emailVerifyToken).catch(
    (e) => logger.warn('[Auth] Insurance verification email failed:', e)
  );
  sendApprovalPendingEmail(
    user.email,
    provider.companyName,
    'INSURANCE_PROVIDER',
    'UHID Super Admin'
  ).catch((e) => logger.warn('[Auth] Insurance approval email failed:', e));

  const tokens = await createTokenPair(user.id, user.role);

  logger.info(`[Auth] Insurance provider registered (pending approval): ${user.id} | ${data.companyName}`);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: false,
      isActive: true,
    },
    tokens,
    profile: {
      companyName: provider.companyName,
      licenseNumber: provider.licenseNumber,
      isVerified: false,
    },
    requiresApproval: true,
    requiresEmailVerification: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN  (same endpoint for all roles)
// ─────────────────────────────────────────────────────────────────────────────
export async function loginUser(data: LoginInput): Promise<BaseAuthResult> {
  // 1. Find user — use generic error to not reveal email existence
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      isEmailVerified: true,
      isActive: true,
    },
  });

  if (!user) httpError('Invalid email or password', 401);

  // 2. Verify password — use constant-time verify
  const passwordValid = await argon2.verify(user.passwordHash, data.password);
  if (!passwordValid) {
    // Log failed attempt (non-blocking)
    logger.warn(`[Auth] Failed login attempt for: ${data.email}`);
    httpError('Invalid email or password', 401);
  }

  // 3. Account active check
  if (!user.isActive) {
    httpError('Your account has been suspended. Please contact support.', 403);
  }

  // 4. Role-specific verification checks
  let profile: Record<string, unknown> = {};
  let requiresApproval = false;

  if (user.role === Role.DOCTOR) {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: user.id },
      include: { hospital: { select: { name: true } } },
    });
    if (!doctor) httpError('Doctor profile not found. Please contact support.', 500);
    if (!doctor.isVerified) {
      requiresApproval = true; // Frontend shows "Pending Approval" screen
    }
    profile = {
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      specialty: doctor.specialty,
      licenseNumber: doctor.licenseNumber,
      hospitalId: doctor.hospitalId,
      hospitalName: doctor.hospital.name,
      isVerified: doctor.isVerified,
      rating: doctor.rating,
      photoUrl: doctor.photoUrl,
    };
  } else if (user.role === Role.HOSPITAL_STAFF) {
    const staff = await prisma.hospitalStaff.findUnique({
      where: { userId: user.id },
      include: { hospital: { select: { name: true } } },
    });
    if (!staff) httpError('Staff profile not found. Please contact support.', 500);
    if (!staff.isVerified) {
      requiresApproval = true;
    }
    profile = {
      firstName: staff.firstName,
      lastName: staff.lastName,
      staffType: staff.staffType,
      employeeId: staff.employeeId,
      hospitalId: staff.hospitalId,
      hospitalName: staff.hospital.name,
      isVerified: staff.isVerified,
    };
  } else if (user.role === Role.PATIENT) {
    const patient = await prisma.patient.findUnique({
      where: { userId: user.id },
    });
    if (!patient) httpError('Patient profile not found. Please contact support.', 500);
    profile = {
      uhid: patient.uhid,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      phone: patient.phone,
      photoUrl: patient.photoUrl,
    };
  } else if (user.role === Role.HOSPITAL_ADMIN) {
    const admin = await prisma.hospitalAdmin.findUnique({
      where: { userId: user.id },
      include: { hospital: { select: { id: true, name: true } } },
    });
    if (!admin) httpError('Admin profile not found. Please contact support.', 500);
    profile = {
      firstName: admin.firstName,
      lastName: admin.lastName,
      hospitalId: admin.hospitalId,
      hospitalName: admin.hospital.name,
    };
  } else if (user.role === Role.INSURANCE_PROVIDER) {
    const provider = await prisma.insuranceProvider.findUnique({
      where: { userId: user.id },
    });
    if (!provider) httpError('Insurance provider profile not found.', 500);
    if (!provider.isVerified) {
      requiresApproval = true;
    }
    profile = {
      companyName: provider.companyName,
      licenseNumber: provider.licenseNumber,
      isVerified: provider.isVerified,
    };
  } else if (user.role === Role.SUPER_ADMIN) {
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { userId: user.id },
    });
    if (!superAdmin) httpError('Super admin profile not found.', 500);
    profile = {
      firstName: superAdmin.firstName,
      lastName: superAdmin.lastName,
    };
  }

  // 5. Write audit log (non-blocking)
  prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorRole: user.role,
      action: 'LOGIN',
      severity: 'LOW',
      ipAddress: null,
      userAgent: null,
      metadata: { role: user.role },
    },
  }).catch((e) => logger.warn('[Auth] AuditLog write failed:', e));

  // 6. Issue tokens
  const tokens = await createTokenPair(user.id, user.role);

  logger.info(`[Auth] Login success: ${user.id} (${user.role})`);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
    },
    tokens,
    profile,
    requiresApproval,
    requiresEmailVerification: !user.isEmailVerified,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REFRESH TOKENS
// ─────────────────────────────────────────────────────────────────────────────
export async function refreshTokens(rawRefreshToken: string): Promise<TokenPair> {
  let payload: { userId: string; sessionId: string };

  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    httpError('Invalid or expired refresh token', 401);
  }

  const stored = await redis.get(`refresh:${payload.userId}:${payload.sessionId}`);
  if (!stored || stored !== rawRefreshToken) {
    httpError('Refresh token revoked or expired. Please log in again.', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    httpError('Account not found or suspended', 401);
  }

  // Rotate: delete old, issue new (prevents replay)
  await redis.del(`refresh:${payload.userId}:${payload.sessionId}`);

  logger.info(`[Auth] Token refreshed: ${payload.userId}`);

  return createTokenPair(user.id, user.role);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────────────────
export async function logout(
  userId: string,
  sessionId: string,
  accessToken: string,
  role?: Role
): Promise<void> {
  // Delete refresh token from Redis
  await redis.del(`refresh:${userId}:${sessionId}`);

  // Blacklist the access token for its remaining TTL (prevents reuse)
  await redis.setex(`blacklist:${accessToken}`, TTL.BLACKLIST, '1');

  // Audit log (non-blocking) — role comes from JWT payload via controller
  if (role) {
    prisma.auditLog.create({
      data: {
        actorId: userId,
        actorRole: role,
        action: 'LOGOUT',
        severity: 'LOW',
        metadata: {},
      },
    }).catch((_e: unknown) => logger.warn('[Auth] AuditLog write failed on logout'));
  }

  logger.info(`[Auth] Logout: ${userId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyEmail(token: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { emailVerifyToken: token },
  });

  if (!user) {
    httpError('Invalid or expired verification token', 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      emailVerifyToken: null, // consume token
    },
  });

  // Audit log
  prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorRole: user.role,
      action: 'EMAIL_VERIFIED',
      severity: 'LOW',
      metadata: {},
    },
  }).catch((_e: unknown) => logger.warn('[Auth] AuditLog write failed on email verify'));

  // Send welcome email for patients
  if (user.role === Role.PATIENT) {
    const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (patient) {
      sendWelcomePatientEmail(
        user.email,
        `${patient.firstName} ${patient.lastName}`,
        patient.uhid
      ).catch((e) => logger.warn('[Auth] Welcome email failed:', e));
    }
  }

  logger.info(`[Auth] Email verified: ${user.id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success — do NOT reveal if email is registered
  if (!user) return;

  const resetToken = crypto.randomBytes(32).toString('hex');
  await redis.setex(`reset:${resetToken}`, 3600, user.id); // 1 hour TTL

  // Get display name per role
  let displayName = 'User';
  try {
    if (user.role === Role.PATIENT) {
      const p = await prisma.patient.findUnique({ where: { userId: user.id } });
      if (p) displayName = `${p.firstName} ${p.lastName}`;
    } else if (user.role === Role.DOCTOR) {
      const d = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (d) displayName = `Dr. ${d.firstName} ${d.lastName}`;
    } else if (user.role === Role.HOSPITAL_STAFF) {
      const s = await prisma.hospitalStaff.findUnique({ where: { userId: user.id } });
      if (s) displayName = `${s.firstName} ${s.lastName}`;
    } else if (user.role === Role.HOSPITAL_ADMIN) {
      const a = await prisma.hospitalAdmin.findUnique({ where: { userId: user.id } });
      if (a) displayName = `${a.firstName} ${a.lastName}`;
    } else if (user.role === Role.INSURANCE_PROVIDER) {
      const ip = await prisma.insuranceProvider.findUnique({ where: { userId: user.id } });
      if (ip) displayName = ip.companyName;
    } else if (user.role === Role.SUPER_ADMIN) {
      const sa = await prisma.superAdmin.findUnique({ where: { userId: user.id } });
      if (sa) displayName = `${sa.firstName} ${sa.lastName}`;
    }
  } catch (e) {
    logger.warn('[Auth] Could not fetch display name for password reset email:', e);
  }

  await sendPasswordResetEmail(email, displayName, resetToken);

  // Audit log
  prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorRole: user.role,
      action: 'PASSWORD_RESET',
      severity: 'MEDIUM',
      metadata: { step: 'reset_requested' },
    },
  }).catch((_e: unknown) => logger.warn('[Auth] AuditLog write failed on forgot-password'));

  logger.info(`[Auth] Password reset link sent: ${user.id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const userId = await redis.get(`reset:${token}`);
  if (!userId) {
    httpError('Invalid or expired reset token. Please request a new one.', 400);
  }

  const passwordHash = await hashPassword(newPassword);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
    select: { role: true },
  });

  // Delete reset token
  await redis.del(`reset:${token}`);

  // Delete ALL refresh tokens for this user (security: logout all devices on password reset)
  const keys = await redis.keys(`refresh:${userId}:*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }

  // Audit log
  prisma.auditLog.create({
    data: {
      actorId: userId,
      actorRole: updatedUser.role,
      action: 'PASSWORD_RESET',
      severity: 'HIGH',
      metadata: { step: 'reset_completed' },
    },
  }).catch((_e: unknown) => logger.warn('[Auth] AuditLog write failed on reset-password'));

  logger.info(`[Auth] Password reset completed: ${userId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE PASSWORD  (authenticated user)
// ─────────────────────────────────────────────────────────────────────────────
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true },
  });

  const valid = await argon2.verify(user.passwordHash, currentPassword);
  if (!valid) {
    httpError('Current password is incorrect', 400);
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  logger.info(`[Auth] Password changed: ${userId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ME  (return full profile for the authenticated user)
// ─────────────────────────────────────────────────────────────────────────────
export async function getMe(userId: string): Promise<{
  user: Record<string, unknown>;
  profile: Record<string, unknown> | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isEmailVerified: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user) httpError('User not found', 404);

  let profile: Record<string, unknown> | null = null;

  if (user.role === Role.PATIENT) {
    const p = await prisma.patient.findUnique({ where: { userId } });
    if (p) {
      profile = {
        uhid: p.uhid,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        phone: p.phone,
        photoUrl: p.photoUrl,
        allergies: p.allergies,
        chronicConditions: p.chronicConditions,
        address: p.address,
        city: p.city,
        state: p.state,
        pincode: p.pincode,
      };
    }
  } else if (user.role === Role.DOCTOR) {
    const d = await prisma.doctor.findUnique({
      where: { userId },
      include: { hospital: { select: { id: true, name: true, city: true } } },
    });
    if (d) {
      profile = {
        firstName: d.firstName,
        lastName: d.lastName,
        specialty: d.specialty,
        licenseNumber: d.licenseNumber,
        qualifications: d.qualifications,
        experienceYears: d.experienceYears,
        consultationFee: d.consultationFee,
        availableForVideo: d.availableForVideo,
        availableForInPerson: d.availableForInPerson,
        languages: d.languages,
        isVerified: d.isVerified,
        rating: d.rating,
        totalReviews: d.totalReviews,
        photoUrl: d.photoUrl,
        hospital: d.hospital,
      };
    }
  } else if (user.role === Role.HOSPITAL_STAFF) {
    const s = await prisma.hospitalStaff.findUnique({
      where: { userId },
      include: { hospital: { select: { id: true, name: true } } },
    });
    if (s) {
      profile = {
        firstName: s.firstName,
        lastName: s.lastName,
        staffType: s.staffType,
        employeeId: s.employeeId,
        isVerified: s.isVerified,
        hospital: s.hospital,
      };
    }
  } else if (user.role === Role.HOSPITAL_ADMIN) {
    const a = await prisma.hospitalAdmin.findUnique({
      where: { userId },
      include: { hospital: true },
    });
    if (a) {
      profile = {
        firstName: a.firstName,
        lastName: a.lastName,
        hospital: a.hospital,
      };
    }
  } else if (user.role === Role.INSURANCE_PROVIDER) {
    const ip = await prisma.insuranceProvider.findUnique({ where: { userId } });
    if (ip) {
      profile = {
        companyName: ip.companyName,
        licenseNumber: ip.licenseNumber,
        isVerified: ip.isVerified,
        verifiedAt: ip.verifiedAt,
      };
    }
  } else if (user.role === Role.SUPER_ADMIN) {
    const sa = await prisma.superAdmin.findUnique({ where: { userId } });
    if (sa) {
      profile = {
        firstName: sa.firstName,
        lastName: sa.lastName,
      };
    }
  }

  return { user, profile };
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PROFILE  (patient or doctor)
// ─────────────────────────────────────────────────────────────────────────────
export async function updateProfile(
  userId: string,
  role: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (role === Role.PATIENT) {
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) httpError('Patient profile not found', 404);

    const updated = await prisma.patient.update({
      where: { userId },
      data: {
        ...(data.firstName         !== undefined && { firstName: data.firstName as string }),
        ...(data.lastName          !== undefined && { lastName: data.lastName as string }),
        ...(data.phone             !== undefined && { phone: (data.phone as string) || null }),
        ...(data.bloodGroup        !== undefined && { bloodGroup: data.bloodGroup as never }),
        ...(data.allergies         !== undefined && { allergies: data.allergies as string[] }),
        ...(data.chronicConditions !== undefined && { chronicConditions: data.chronicConditions as string[] }),
        ...(data.address           !== undefined && { address: (data.address as string) || null }),
        ...(data.city              !== undefined && { city: (data.city as string) || null }),
        ...(data.state             !== undefined && { state: (data.state as string) || null }),
        ...(data.pincode           !== undefined && { pincode: (data.pincode as string) || null }),
      },
    });

    return {
      uhid: updated.uhid,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      bloodGroup: updated.bloodGroup,
      allergies: updated.allergies,
      chronicConditions: updated.chronicConditions,
      address: updated.address,
      city: updated.city,
      state: updated.state,
      pincode: updated.pincode,
    };
  }

  if (role === Role.DOCTOR) {
    const doctor = await prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) httpError('Doctor profile not found', 404);

    const updated = await prisma.doctor.update({
      where: { userId },
      data: {
        ...(data.firstName            !== undefined && { firstName: data.firstName as string }),
        ...(data.lastName             !== undefined && { lastName: data.lastName as string }),
        ...(data.specialty            !== undefined && { specialty: data.specialty as string }),
        ...(data.qualifications       !== undefined && { qualifications: data.qualifications as string[] }),
        ...(data.experienceYears      !== undefined && { experienceYears: data.experienceYears as number }),
        ...(data.consultationFee      !== undefined && { consultationFee: data.consultationFee as number }),
        ...(data.languages            !== undefined && { languages: data.languages as string[] }),
        ...(data.availableForVideo    !== undefined && { availableForVideo: data.availableForVideo as boolean }),
        ...(data.availableForInPerson !== undefined && { availableForInPerson: data.availableForInPerson as boolean }),
        ...(data.slotDurationMinutes  !== undefined && { slotDurationMinutes: data.slotDurationMinutes as number }),
      },
      include: { hospital: { select: { id: true, name: true, city: true } } },
    });

    return {
      firstName: updated.firstName,
      lastName: updated.lastName,
      specialty: updated.specialty,
      qualifications: updated.qualifications,
      experienceYears: updated.experienceYears,
      consultationFee: updated.consultationFee,
      languages: updated.languages,
      availableForVideo: updated.availableForVideo,
      availableForInPerson: updated.availableForInPerson,
      slotDurationMinutes: updated.slotDurationMinutes,
      hospital: updated.hospital,
    };
  }

  httpError('Profile updates are only supported for Patient and Doctor roles', 400);
}
