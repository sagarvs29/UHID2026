import { z } from 'zod';

// ─── Upload Record ────────────────────────────────────────────────────────────
export const uploadRecordSchema = z.object({
  patientUhid: z
    .string({ required_error: 'Patient UHID is required' })
    .min(1, 'Patient UHID is required'),

  recordType: z.enum(
    ['LAB_REPORT', 'IMAGING', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'VACCINATION', 'ECG', 'OTHER'],
    { required_error: 'Record type is required' }
  ),

  subType: z
    .enum([
      'BLOOD_TEST',
      'URINE_TEST',
      'LIVER_FUNCTION',
      'KIDNEY_FUNCTION',
      'LIPID_PROFILE',
      'THYROID',
      'HBA1C',
      'BLOOD_SUGAR',
      'COMPLETE_BLOOD_COUNT',
      'XRAY',
      'MRI',
      'CT_SCAN',
      'ULTRASOUND',
      'PET_SCAN',
      'MAMMOGRAPHY',
      'ECG_RECORDING',
      'COVID_VACCINE',
    ])
    .optional(),

  title: z
    .string({ required_error: 'Title is required' })
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),

  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),

  recordDate: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), 'Invalid date format')
    .refine((d) => new Date(d) <= new Date(), 'Record date cannot be in the future')
    .optional(),

  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (!v) return [];
      if (Array.isArray(v)) return v.flatMap((t) => t.split(',').map((s) => s.trim()).filter(Boolean));
      return v.split(',').map((t) => t.trim()).filter(Boolean);
    }),
});

// ─── Get Records (query params) ───────────────────────────────────────────────
export const getRecordsQuerySchema = z.object({
  type: z
    .enum(['LAB_REPORT', 'IMAGING', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'VACCINATION', 'ECG', 'OTHER'])
    .optional(),

  subType: z
    .enum([
      'BLOOD_TEST', 'URINE_TEST', 'LIVER_FUNCTION', 'KIDNEY_FUNCTION',
      'LIPID_PROFILE', 'THYROID', 'HBA1C', 'BLOOD_SUGAR', 'COMPLETE_BLOOD_COUNT',
      'XRAY', 'MRI', 'CT_SCAN', 'ULTRASOUND', 'PET_SCAN', 'MAMMOGRAPHY',
      'ECG_RECORDING', 'COVID_VACCINE',
    ])
    .optional(),

  hospitalId: z.string().optional(),

  from: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), 'Invalid from date')
    .optional(),

  to: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), 'Invalid to date')
    .optional(),

  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v !== undefined ? parseInt(String(v), 10) : 1))
    .pipe(z.number().min(1)),

  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v !== undefined ? parseInt(String(v), 10) : 10))
    .pipe(z.number().min(1).max(50)),

  sort: z.enum(['createdAt_asc', 'createdAt_desc', 'recordDate_asc', 'recordDate_desc']).optional(),
});
