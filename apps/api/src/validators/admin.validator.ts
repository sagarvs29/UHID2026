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
  name:               z.string().min(2, 'Hospital name is required').max(200, 'Name too long (max 200)').trim(),
  registrationNumber: z.string().min(2, 'Registration number is required').max(50, 'Registration number too long (max 50)')
                        .regex(/^[A-Za-z0-9\-\/]+$/, 'Only letters, numbers, hyphens, slashes allowed')
                        .trim(),
  address:            z.string().min(5, 'Address must be at least 5 characters').max(500, 'Address too long (max 500)').trim(),
  city:               z.string().min(2, 'City is required').max(100, 'City too long')
                        .regex(/^[A-Za-z\s\-.]+$/, 'City must contain only letters')
                        .trim(),
  state:              z.string().min(2, 'State is required').max(100, 'State too long')
                        .regex(/^[A-Za-z\s\-.]+$/, 'State must contain only letters')
                        .trim(),
  pincode:            z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  phone:              z.string()
                        .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile (10 digits, starts 6-9)')
                        .optional()
                        .or(z.literal('')),
  email:              z.string().email('Invalid email address').max(150, 'Email too long')
                        .optional()
                        .or(z.literal('')),
  isNABH:             z.boolean().default(false),
  specialties:        z.array(z.string().max(100)).max(20, 'Max 20 specialties').default([]),
});

export type VerifyStaffInput     = z.infer<typeof verifyStaffSchema>;
export type DeactivateStaffInput = z.infer<typeof deactivateStaffSchema>;
export type AuditLogQuery        = z.infer<typeof auditLogQuerySchema>;
export type HospitalActionInput  = z.infer<typeof hospitalActionSchema>;
export type CreateHospitalInput  = z.infer<typeof createHospitalSchema>;
