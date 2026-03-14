import { z } from 'zod';

// ─── Appointment type / status enums (mirror Prisma) ─────────────────────────

export const AppointmentTypeEnum = z.enum(['IN_PERSON', 'VIDEO', 'PHONE']);
export const AppointmentStatusEnum = z.enum([
  'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW',
]);

// ─── Book Appointment ─────────────────────────────────────────────────────────

export const bookAppointmentSchema = z.object({
  doctorId:       z.string().cuid('Invalid doctor ID'),
  scheduledAt:    z
    .string()
    .datetime({ message: 'scheduledAt must be a valid ISO 8601 datetime' })
    .refine((v) => new Date(v) > new Date(), { message: 'Appointment must be in the future' }),
  type:           AppointmentTypeEnum,
  chiefComplaint: z.string().min(5, 'Chief complaint must be at least 5 characters').max(500).optional(),
  notes:          z.string().max(2000).optional(),
});

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;

// ─── Cancel Appointment ───────────────────────────────────────────────────────

export const cancelAppointmentSchema = z.object({
  reason: z.string().min(5, 'Cancellation reason must be at least 5 characters').max(500),
});

export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

// ─── Doctor Search Query ──────────────────────────────────────────────────────

export const doctorSearchSchema = z.object({
  specialty:  z.string().optional(),
  city:       z.string().optional(),
  hospitalId: z.string().optional(),
  rating:     z.coerce.number().min(1).max(5).optional(),
  available:  z.enum(['true', 'false']).optional(),
  search:     z.string().max(100).optional(),
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().min(1).max(50).default(20),
});

export type DoctorSearchInput = z.infer<typeof doctorSearchSchema>;

// ─── Slot Query ───────────────────────────────────────────────────────────────

export const slotQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD')
    .optional(),
});

export type SlotQueryInput = z.infer<typeof slotQuerySchema>;

// ─── Appointment List Query ───────────────────────────────────────────────────

export const appointmentListSchema = z.object({
  status: AppointmentStatusEnum.optional(),
  from:   z.string().datetime().optional(),
  to:     z.string().datetime().optional(),
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().min(1).max(50).default(20),
});

export type AppointmentListInput = z.infer<typeof appointmentListSchema>;

// ─── Submit Review ────────────────────────────────────────────────────────────

export const submitReviewSchema = z.object({
  rating:      z.number().int().min(1).max(5),
  comment:     z.string().max(1000).optional(),
  isAnonymous: z.boolean().default(false),
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
