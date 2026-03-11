import argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { redis, TTL } from '@/lib/redis';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/jwt';
import { generateOtp, generateUHID } from '@/lib/crypto';
import { sendOtpEmail, sendWelcomeEmail, sendPasswordResetEmail } from '@/lib/email';
import { sendOtpSms } from '@/lib/sms';
import { RegisterInput, LoginInput } from '@/validators/auth.validator';
import logger from '@/lib/logger';
import { Role } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────
interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface LoginResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    uhid?: string | null;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
  };
  tokens: TokenPair;
}

// ─── Helpers ──────────────────────────────────────────────
async function createTokenPair(userId: string, role: string): Promise<TokenPair> {
  const sessionId = uuidv4();
  const accessToken = signAccessToken({ userId, role, sessionId });
  const refreshToken = signRefreshToken({ userId, sessionId });

  // Store refresh token in Redis
  await redis.setex(
    `refresh:${userId}:${sessionId}`,
    TTL.REFRESH_TOKEN,
    refreshToken
  );

  return { accessToken, refreshToken };
}

// ─── Auth Service ─────────────────────────────────────────
export async function registerUser(data: RegisterInput): Promise<LoginResult> {
  // Check email uniqueness
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    const err = new Error('Email already registered') as Error & { statusCode: number };
    err.statusCode = 409;
    throw err;
  }

  // Check phone uniqueness
  const existingPhone = await prisma.user.findFirst({
    where: { phone: data.phone },
  });
  if (existingPhone) {
    const err = new Error('Phone number already registered') as Error & { statusCode: number };
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await argon2.hash(data.password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  const uhid = data.role === 'PATIENT' ? generateUHID() : null;

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: data.role as Role,
      uhid,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      uhid: true,
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });

  // Send welcome email (don't await — non-blocking)
  sendWelcomeEmail(user.email, user.name, user.uhid ?? user.id).catch((e) =>
    logger.warn('[Auth] Welcome email failed:', e)
  );

  const tokens = await createTokenPair(user.id, user.role);

  logger.info(`[Auth] New user registered: ${user.id} (${user.role})`);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      uhid: user.uhid,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
    },
    tokens,
  };
}

export async function loginUser(data: LoginInput): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      uhid: true,
      passwordHash: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    },
  });

  if (!user) {
    const err = new Error('Invalid email or password') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  if (!user.isActive) {
    const err = new Error('Account suspended. Please contact support.') as Error & { statusCode: number };
    err.statusCode = 403;
    throw err;
  }

  const valid = await argon2.verify(user.passwordHash, data.password);
  if (!valid) {
    const err = new Error('Invalid email or password') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const tokens = await createTokenPair(user.id, user.role);

  logger.info(`[Auth] User logged in: ${user.id} (${user.role})`);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      uhid: user.uhid,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
    },
    tokens,
  };
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  let payload: { userId: string; sessionId: string };

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    const err = new Error('Invalid refresh token') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const stored = await redis.get(`refresh:${payload.userId}:${payload.sessionId}`);
  if (!stored || stored !== refreshToken) {
    const err = new Error('Refresh token expired or revoked') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    const err = new Error('User not found or suspended') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  // Rotate: delete old, issue new
  await redis.del(`refresh:${payload.userId}:${payload.sessionId}`);
  return createTokenPair(user.id, user.role);
}

export async function logout(
  userId: string,
  sessionId: string,
  accessToken: string
): Promise<void> {
  // Remove refresh token
  await redis.del(`refresh:${userId}:${sessionId}`);
  // Blacklist access token for remaining TTL
  await redis.setex(`blacklist:${accessToken}`, TTL.BLACKLIST, '1');
  logger.info(`[Auth] User logged out: ${userId}`);
}

export async function sendOtp(
  identifier: string,
  type: 'email' | 'phone',
  purpose: string
): Promise<void> {
  const otp = generateOtp(6);
  const key = `otp:${purpose}:${identifier}`;

  await redis.setex(key, TTL.OTP, otp);

  if (type === 'email') {
    const user = await prisma.user.findUnique({
      where: { email: identifier },
      select: { name: true },
    });
    await sendOtpEmail(identifier, otp, user?.name ?? 'User');
  } else {
    await sendOtpSms(identifier, otp);
  }

  logger.info(`[Auth] OTP sent for ${purpose} to ${type}`);
}

export async function verifyOtp(
  identifier: string,
  otp: string,
  purpose: string
): Promise<boolean> {
  const key = `otp:${purpose}:${identifier}`;
  const stored = await redis.get(key);

  if (!stored || stored !== otp) return false;

  // Consume OTP
  await redis.del(key);

  // Mark verified in DB if applicable
  if (purpose === 'VERIFY_EMAIL') {
    await prisma.user.updateMany({
      where: { email: identifier },
      data: { isEmailVerified: true },
    });
  } else if (purpose === 'VERIFY_PHONE') {
    await prisma.user.updateMany({
      where: { phone: identifier },
      data: { isPhoneVerified: true },
    });
  }

  return true;
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Silent — don't reveal if email exists

  const resetToken = uuidv4();
  await redis.setex(`reset:${resetToken}`, 3600, user.id); // 1 hour
  await sendPasswordResetEmail(email, user.name, resetToken);

  logger.info(`[Auth] Password reset link sent: ${user.id}`);
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  const userId = await redis.get(`reset:${token}`);
  if (!userId) {
    const err = new Error('Invalid or expired reset token') as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }

  const passwordHash = await argon2.hash(newPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await redis.del(`reset:${token}`);
  logger.info(`[Auth] Password reset successful: ${userId}`);
}

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
    const err = new Error('Current password is incorrect') as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }

  const passwordHash = await argon2.hash(newPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  logger.info(`[Auth] Password changed: ${userId}`);
}
