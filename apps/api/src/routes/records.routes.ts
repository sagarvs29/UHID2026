import { Router } from 'express';
import { authenticate, authorize } from '@/middlewares/auth.middleware';
import { handleUpload } from '@/middlewares/upload.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { uploadRecordSchema, getRecordsQuerySchema } from '@/validators/records.validator';
import * as controller from '@/controllers/records.controller';

const router = Router();

// ─── POST /api/v1/records/upload ─────────────────────────────────────────────
// Hospital staff uploads a medical record file for a patient
router.post(
  '/upload',
  authenticate,
  authorize('HOSPITAL_STAFF'),
  handleUpload,
  validate(uploadRecordSchema),
  controller.uploadRecord
);

// ─── IMPORTANT: Specific /record/:id routes BEFORE wildcard /:uhid ───────────
// If /:uhid comes first, Express would interpret "record" as a UHID value.

// GET /api/v1/records/record/:id/download — generate signed download URL
router.get(
  '/record/:id/download',
  authenticate,
  authorize('PATIENT', 'DOCTOR'),
  controller.downloadRecord
);

// GET /api/v1/records/record/:id — fetch single record details
router.get(
  '/record/:id',
  authenticate,
  authorize('PATIENT', 'DOCTOR', 'HOSPITAL_STAFF', 'HOSPITAL_ADMIN'),
  controller.getRecord
);

// GET /api/v1/records/:uhid — list all records for a patient by their UHID
router.get(
  '/:uhid',
  authenticate,
  authorize('PATIENT', 'DOCTOR', 'HOSPITAL_STAFF', 'HOSPITAL_ADMIN'),
  validate(getRecordsQuerySchema, 'query'),
  controller.getRecords
);

export default router;
