import { z } from 'zod';

// ─── Shared UHID regex ─────────────────────────────────────────────────────────
const uhidRegex = /^UHID-[A-Z0-9]{4}-[A-Z0-9]{4}-[0-9]{4}$/;

// ─── DrugForm / DrugRoute enums (mirror Prisma) ───────────────────────────────
const DrugFormEnum = z.enum([
  'TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM',
  'DROPS', 'INHALER', 'PATCH', 'SUPPOSITORY', 'OTHER',
]);

const DrugRouteEnum = z.enum([
  'ORAL', 'IV', 'IM', 'TOPICAL', 'INHALATION',
  'SUBLINGUAL', 'RECTAL', 'NASAL', 'OTHER',
]);

const NoteVisibilityEnum = z.enum(['PRIVATE', 'HOSPITAL', 'PATIENT_VISIBLE']);

// ─── Prescription Item ────────────────────────────────────────────────────────
export const prescriptionItemSchema = z.object({
  drugName:     z.string().min(2, 'Drug name must be at least 2 characters').max(200),
  dosage:       z.string().min(1, 'Dosage is required').max(50),
  form:         DrugFormEnum,
  frequency:    z.string().min(1, 'Frequency is required').max(100),
  duration:     z.string().min(1, 'Duration is required').max(100),
  route:        DrugRouteEnum,
  instructions: z.string().max(500).optional(),
  quantity:     z.number().int('Quantity must be a whole number').positive('Quantity must be positive').max(9999),
});

export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;

// ─── Create Prescription ──────────────────────────────────────────────────────
export const createPrescriptionSchema = z.object({
  patientUhid:  z.string().regex(uhidRegex, 'Invalid UHID format'),
  diagnosis:    z.string().min(3, 'Diagnosis must be at least 3 characters').max(300),
  notes:        z.string().max(2000).optional(),
  followUpDate: z.string().datetime({ message: 'Invalid ISO 8601 datetime for followUpDate' }).optional(),
  validUntil:   z.string().datetime({ message: 'Invalid ISO 8601 datetime for validUntil' }).optional(),
  items:        z.array(prescriptionItemSchema).min(1, 'At least one prescription item is required').max(20),
  // Optional pharma-check overrides (HIGH severity)
  overrides: z
    .array(
      z.object({
        interactionKey: z.string().min(1),
        reason:         z.string().min(30, 'Override reason must be at least 30 characters'),
      })
    )
    .optional(),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

// ─── Create Clinical Note ─────────────────────────────────────────────────────
export const createClinicalNoteSchema = z.object({
  patientUhid:         z.string().regex(uhidRegex, 'Invalid UHID format'),
  chiefComplaint:      z.string().min(5, 'Chief complaint must be at least 5 characters').max(500),
  symptoms:            z.array(z.string().min(1)).default([]),
  icd10Code:           z
    .string()
    .regex(
      /^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/,
      'Invalid ICD-10 code format (e.g. J18.9)'
    ),
  icd10Description:    z.string().min(2, 'ICD-10 description is required').max(200),
  examinationFindings: z.string().max(5000).optional(),
  vitalSigns: z
    .object({
      bp:          z.string().regex(/^\d{2,3}\/\d{2,3}$/, 'BP must be in format 120/80').optional(),
      pulse:       z.number().int().min(20).max(300).optional(),
      temperature: z.number().min(30).max(45).optional(),
      spo2:        z.number().int().min(70).max(100).optional(),
      weight:      z.number().positive().optional(),
      height:      z.number().positive().optional(),
    })
    .optional(),
  diagnosis:     z.string().min(3, 'Diagnosis must be at least 3 characters').max(500),
  treatmentPlan: z.string().max(5000).optional(),
  visibility:    NoteVisibilityEnum,
});

export type CreateClinicalNoteInput = z.infer<typeof createClinicalNoteSchema>;

// ─── Pharma-Check (standalone — no prescription save) ────────────────────────
export const pharmaCheckSchema = z.object({
  patientUhid: z.string().regex(uhidRegex, 'Invalid UHID format'),
  drugs: z
    .array(
      z.object({
        name:   z.string().min(1, 'Drug name is required'),
        dosage: z.string().min(1, 'Dosage is required'),
      })
    )
    .min(1, 'At least one drug is required')
    .max(20, 'Cannot check more than 20 drugs at once'),
});

export type PharmaCheckInput = z.infer<typeof pharmaCheckSchema>;
