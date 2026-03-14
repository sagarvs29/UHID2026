import { Router } from 'express';
import { authenticate, authorize } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import {
  createClinicalNoteSchema,
  createPrescriptionSchema,
  pharmaCheckSchema,
} from '@/validators/clinical.validator';
import * as clinicalController from '@/controllers/clinical.controller';

const router = Router();

// All clinical routes require authentication
router.use(authenticate);

// ─── Patient Profile ──────────────────────────────────────────────────────────
// GET /api/v1/clinical/patient/:uhid
router.get(
  '/patient/:uhid',
  authorize('DOCTOR'),
  clinicalController.getPatientProfile
);

// ─── Clinical Notes ───────────────────────────────────────────────────────────
// POST /api/v1/clinical/notes
router.post(
  '/notes',
  authorize('DOCTOR'),
  validate(createClinicalNoteSchema),
  clinicalController.createClinicalNote
);

// GET /api/v1/clinical/notes/single/:id  — must be BEFORE /:patientUhid to avoid route collision
router.get(
  '/notes/single/:id',
  authorize('DOCTOR', 'PATIENT'),
  clinicalController.getSingleClinicalNote
);

// GET /api/v1/clinical/notes/:patientUhid
router.get(
  '/notes/:patientUhid',
  authorize('DOCTOR', 'PATIENT'),
  clinicalController.getClinicalNotes
);

// ─── Prescriptions ────────────────────────────────────────────────────────────
// POST /api/v1/clinical/prescriptions
router.post(
  '/prescriptions',
  authorize('DOCTOR'),
  validate(createPrescriptionSchema),
  clinicalController.createPrescription
);

// GET /api/v1/clinical/prescriptions/single/:id — must be BEFORE /:patientUhid
router.get(
  '/prescriptions/single/:id',
  authorize('DOCTOR', 'PATIENT'),
  clinicalController.getSinglePrescription
);

// GET /api/v1/clinical/prescriptions/:patientUhid
router.get(
  '/prescriptions/:patientUhid',
  authorize('DOCTOR', 'PATIENT'),
  clinicalController.getPrescriptions
);

// ─── Pharma-Check (no save) ───────────────────────────────────────────────────
// POST /api/v1/clinical/pharma-check
router.post(
  '/pharma-check',
  authorize('DOCTOR'),
  validate(pharmaCheckSchema),
  clinicalController.pharmaCheck
);

export default router;
