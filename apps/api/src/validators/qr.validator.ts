import { z } from 'zod';

// ─── Shared ───────────────────────────────────────────────────────────────────

const uhidRegex = /^UHID-[A-Z0-9]{4}-[A-Z0-9]{4}-[0-9]{4}$/;

const validConsentScopes = [
  'LAB_REPORT',
  'PRESCRIPTION',
  'CLINICAL_NOTES',
  'DISCHARGE_SUMMARY',
  'IMAGING',
  'VACCINATION',
  'INSURANCE',
  'ALL',
] as const;

// ─── GET /qr/emergency/:uhid ─────────────────────────────────────────────────
// Public — no auth — validated via route param (no body schema needed)

// ─── POST /qr/scan/doctor ────────────────────────────────────────────────────
export const doctorScanSchema = z.object({
  qrToken: z.string().min(10, 'Invalid QR token'),
});

// ─── POST /qr/generate ───────────────────────────────────────────────────────
export const generateQrSchema = z.object({
  scope: z
    .array(z.enum(validConsentScopes))
    .min(1, 'At least one scope must be selected'),
  durationMinutes: z
    .number()
    .int()
    .min(5, 'Minimum duration is 5 minutes')
    .max(60, 'Maximum duration is 60 minutes'),
  label: z.string().max(100).optional(),
});

// ─── POST /qr/invalidate ─────────────────────────────────────────────────────
export const invalidateQrSchema = z.object({
  reason: z.string().min(1).max(200).optional().default('Manual invalidation'),
});

// ─── POST /qr/sos ────────────────────────────────────────────────────────────
export const sosSchema = z.object({
  latitude: z
    .number()
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude'),
  longitude: z
    .number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude'),
  message: z.string().max(500).optional(),
});

// ─── POST /emergency/override ────────────────────────────────────────────────
const overrideReasonTypes = [
  'PATIENT_UNCONSCIOUS',
  'CRITICAL_CARE_NO_TIME',
  'PATIENT_UNABLE_TO_USE_PHONE',
  'OTHER',
] as const;

export const emergencyOverrideSchema = z.object({
  patientUhid: z
    .string()
    .regex(uhidRegex, 'Invalid UHID format (expected UHID-XXXX-XXXX-0000)'),
  reasonType: z.enum(overrideReasonTypes),
  reason: z
    .string()
    .min(20, 'Reason must be at least 20 characters')
    .max(1000),
  acknowledgement: z.literal(true, {
    errorMap: () => ({
      message: 'You must acknowledge that this access is medically necessary',
    }),
  }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────
export type DoctorScanInput        = z.infer<typeof doctorScanSchema>;
export type GenerateQrInput        = z.infer<typeof generateQrSchema>;
export type InvalidateQrInput      = z.infer<typeof invalidateQrSchema>;
export type SosInput               = z.infer<typeof sosSchema>;
export type EmergencyOverrideInput = z.infer<typeof emergencyOverrideSchema>;
