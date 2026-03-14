import { z } from 'zod';

const uhidRegex = /^UHID-[A-Z0-9]{4}-[A-Z0-9]{4}-[0-9]{4}$/;

export const decodeReportSchema = z.object({
  recordId: z.string().cuid('Invalid record ID'),
});

export const clinicalSummarySchema = z.object({
  patientUhid: z
    .string()
    .regex(uhidRegex, 'Invalid UHID format (expected UHID-XXXX-XXXX-0000)'),
});

export type DecodeReportInput    = z.infer<typeof decodeReportSchema>;
export type ClinicalSummaryInput = z.infer<typeof clinicalSummarySchema>;
