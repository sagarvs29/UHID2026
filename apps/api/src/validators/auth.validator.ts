import { z } from 'zod';

const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile numbers

// ─── Registration ──────────────────────────────────────────
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100)
    .trim(),
  email: z.string().email('Invalid email address').toLowerCase(),
  phone: z
    .string()
    .regex(phoneRegex, 'Invalid Indian mobile number (10 digits, starts with 6-9)'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, number and special character'
    ),
  role: z.enum([
    'PATIENT',
    'DOCTOR',
    'HOSPITAL_STAFF',
    'HOSPITAL_ADMIN',
    'INSURANCE_PROVIDER',
  ]),
  // Optional: role-specific fields passed in body
  specialization: z.string().max(100).optional(),
  licenseNumber: z.string().max(50).optional(),
  hospitalId: z.string().uuid().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ─── Login ─────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Email OTP ─────────────────────────────────────────────
export const sendOtpSchema = z.object({
  email: z.string().email().toLowerCase().optional(),
  phone: z.string().regex(phoneRegex).optional(),
  purpose: z.enum(['REGISTER', 'LOGIN', 'RESET_PASSWORD', 'VERIFY_PHONE']),
}).refine((d) => d.email || d.phone, {
  message: 'Either email or phone is required',
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;

// ─── Verify OTP ────────────────────────────────────────────
export const verifyOtpSchema = z.object({
  email: z.string().email().toLowerCase().optional(),
  phone: z.string().regex(phoneRegex).optional(),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/),
  purpose: z.enum(['REGISTER', 'LOGIN', 'RESET_PASSWORD', 'VERIFY_PHONE']),
}).refine((d) => d.email || d.phone, {
  message: 'Either email or phone is required',
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

// ─── Refresh Token ─────────────────────────────────────────
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// ─── Forgot Password ───────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

// ─── Reset Password ────────────────────────────────────────
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, number and special character'
    ),
});

// ─── Change Password ───────────────────────────────────────
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, number and special character'
    ),
});
