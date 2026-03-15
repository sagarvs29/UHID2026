import { z } from 'zod';

// ─── Staff verification ───────────────────────────────────────────────────────

export const verifyStaffSchema = z.object({
  action: z.enum(['VERIFY', 'REJECT', 'REQUEST_MORE_INFO']),
  notes:  z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.action === 'REJECT' && (!data.notes || data.notes.trim().length < 10)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['notes'],
      message: 'Notes are required (min 10 chars) when rejecting',
    });
  }
});

// ─── Staff deactivation ───────────────────────────────────────────────────────

export const deactivateStaffSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

// ─── Audit log list ───────────────────────────────────────────────────────────

export const auditLogQuerySchema = z.object({
  action:     z.string().optional(),
  actorRole:  z.string().optional(),
  targetUhid: z.string().optional(),
  severity:   z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  hospitalId: z.string().optional(),
  search:     z.string().optional(),
  dateFrom:   z.string().optional(),
  dateTo:     z.string().optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(50),
});

// ─── Hospital verification (super admin) ─────────────────────────────────────

export const hospitalActionSchema = z.object({
  action: z.enum(['VERIFY', 'SUSPEND']),
  notes:  z.string().optional(),
});

// ─── Hospital creation (super admin) ──────────────────────────────────────────

export const createHospitalSchema = z.object({
  name:               z.string().min(2, 'Hospital name is required').max(200).trim(),
  registrationNumber: z.string().min(2, 'Registration number is required').max(50).trim(),
  address:            z.string().min(5, 'Address is required').max(500).trim(),
  city:               z.string().min(2, 'City is required').max(100).trim(),
  state:              z.string().min(2, 'State is required').max(100).trim(),
  pincode:            z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  phone:              z.string().max(15).optional().or(z.literal('')),
  email:              z.string().email('Invalid email').optional().or(z.literal('')),
  isNABH:             z.boolean().default(false),
  specialties:        z.array(z.string().max(100)).default([]),
});

export type VerifyStaffInput     = z.infer<typeof verifyStaffSchema>;
export type DeactivateStaffInput = z.infer<typeof deactivateStaffSchema>;
export type AuditLogQuery        = z.infer<typeof auditLogQuerySchema>;
export type HospitalActionInput  = z.infer<typeof hospitalActionSchema>;
export type CreateHospitalInput  = z.infer<typeof createHospitalSchema>;
