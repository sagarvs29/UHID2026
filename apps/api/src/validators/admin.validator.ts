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

export type VerifyStaffInput    = z.infer<typeof verifyStaffSchema>;
export type DeactivateStaffInput = z.infer<typeof deactivateStaffSchema>;
export type AuditLogQuery       = z.infer<typeof auditLogQuerySchema>;
export type HospitalActionInput = z.infer<typeof hospitalActionSchema>;
