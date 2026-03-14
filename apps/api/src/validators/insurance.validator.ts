import { z } from 'zod';
import { ClaimType, ClaimStatus } from '@prisma/client';

// ─── Shared ───────────────────────────────────────────────────────────────────

const icd10Regex = /^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/;

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

// ─── POST /insurance/claims ───────────────────────────────────────────────────
export const submitClaimSchema = z
  .object({
    patientUhid: z
      .string()
      .regex(/^UHID-[A-Z0-9]{4}-[A-Z0-9]{4}-[0-9]{4}$/, 'Invalid UHID format'),
    policyNumber: z
      .string()
      .min(5, 'Policy number must be at least 5 characters')
      .max(50, 'Policy number must be at most 50 characters')
      .regex(/^[A-Z0-9a-z\-\/]+$/, 'Policy number must be alphanumeric')
      .optional(),
    claimType: z.nativeEnum(ClaimType),
    diagnosis: z.string().min(3, 'Diagnosis is required').max(500),
    icd10Code: z.string().regex(icd10Regex, 'Invalid ICD-10 code (e.g. A01 or J18.9)'),
    admissionDate: z
      .string()
      .datetime({ offset: true })
      .or(z.string().date())
      .refine((d) => new Date(d) <= new Date(), 'Admission date must be in the past'),
    dischargeDate: z
      .string()
      .datetime({ offset: true })
      .or(z.string().date())
      .optional(),
    hospitalName: z
      .string()
      .min(3, 'Hospital name must be at least 3 characters')
      .max(200, 'Hospital name must be at most 200 characters'),
    claimedAmount: z
      .number()
      .positive('Claimed amount must be positive')
      .max(10_000_000, 'Claimed amount cannot exceed ₹1 crore'),
    currency: z.string().default('INR'),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.dischargeDate && data.admissionDate) {
        return new Date(data.dischargeDate) >= new Date(data.admissionDate);
      }
      return true;
    },
    { message: 'Discharge date must be on or after admission date', path: ['dischargeDate'] },
  );

// ─── POST /insurance/claims/:id/request-access ────────────────────────────────
export const requestAccessSchema = z.object({
  scope: z
    .array(z.enum(validConsentScopes))
    .min(1, 'At least one record scope is required'),
  purpose: z
    .string()
    .min(10, 'Purpose must be at least 10 characters')
    .max(500),
  durationDays: z
    .number()
    .int()
    .min(1, 'Duration must be at least 1 day')
    .max(90, 'Duration cannot exceed 90 days'),
});

// ─── PATCH /insurance/claims/:id/decision ────────────────────────────────────
export const claimDecisionSchema = z
  .object({
    status: z.nativeEnum(ClaimStatus),
    approvedAmount: z.number().positive().optional(),
    notes: z.string().optional(),
    settlementDate: z
      .string()
      .datetime({ offset: true })
      .or(z.string().date())
      .optional(),
  })
  .refine(
    (data) => {
      if (data.status === ClaimStatus.APPROVED) {
        return data.approvedAmount !== undefined && data.approvedAmount > 0;
      }
      return true;
    },
    { message: 'Approved amount is required when approving a claim', path: ['approvedAmount'] },
  )
  .refine(
    (data) => {
      if (data.status === ClaimStatus.REJECTED) {
        return data.notes !== undefined && data.notes.length >= 20;
      }
      return true;
    },
    { message: 'Notes must be at least 20 characters when rejecting a claim', path: ['notes'] },
  );

// ─── GET /insurance/claims (query params) ─────────────────────────────────────
export const listClaimsSchema = z.object({
  status: z.nativeEnum(ClaimStatus).optional(),
  claimType: z.nativeEnum(ClaimType).optional(),
  riskLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
