import { z } from 'zod';

// ─── Valid ConsentScope values (mirror Prisma enum) ─────────────────────────
const CONSENT_SCOPES = [
  'ALL',
  'LAB_REPORT',
  'IMAGING',
  'PRESCRIPTION',
  'DISCHARGE_SUMMARY',
  'VACCINATION',
  'ECG',
  'CLINICAL_NOTES',
  'EMERGENCY_ONLY',
] as const;

// ─── Request Consent ─────────────────────────────────────────────────────────
export const requestConsentSchema = z.object({
  patientUhid: z
    .string()
    .min(1, 'patientUhid is required')
    .regex(/^UHID-[A-Z0-9]{4}-[A-Z0-9]{4}-[0-9]{4}$/, 'Invalid UHID format'),
  scope: z
    .array(z.enum(CONSENT_SCOPES))
    .min(1, 'At least one scope value is required'),
  purpose: z
    .string()
    .min(10, 'Purpose must be at least 10 characters')
    .max(500, 'Purpose cannot exceed 500 characters'),
  isTemporary: z.boolean().default(true),
  durationHours: z
    .number()
    .int()
    .min(1)
    .max(8760, 'Duration cannot exceed 8760 hours (1 year)')
    .optional(),
}).refine(
  (data) => {
    if (data.isTemporary && !data.durationHours) return false;
    return true;
  },
  { message: 'durationHours is required when isTemporary is true', path: ['durationHours'] }
);

// ─── Send OTP (step 1 of approve flow) ───────────────────────────────────────
export const sendConsentOtpSchema = z.object({
  consentId: z.string().min(1, 'consentId is required'),
});

// ─── Approve Consent ─────────────────────────────────────────────────────────
export const approveConsentSchema = z.object({
  consentId: z.string().min(1, 'consentId is required'),
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must be numeric'),
});

// ─── Deny Consent ────────────────────────────────────────────────────────────
export const denyConsentSchema = z.object({
  consentId: z.string().min(1, 'consentId is required'),
});

// ─── List consents query ─────────────────────────────────────────────────────
export const listConsentsQuerySchema = z.object({
  page: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine((v) => v >= 1, { message: 'page must be >= 1' })
    .default(1),
  limit: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine((v) => v >= 1 && v <= 100, { message: 'limit must be 1–100' })
    .default(20),
});

export type RequestConsentInput = z.infer<typeof requestConsentSchema>;
export type ApproveConsentInput = z.infer<typeof approveConsentSchema>;
export type DenyConsentInput = z.infer<typeof denyConsentSchema>;
