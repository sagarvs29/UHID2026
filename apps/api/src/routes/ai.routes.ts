import { Router } from 'express';
import { authenticate, authorize } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { decodeReportSchema, clinicalSummarySchema } from '@/validators/ai.validator';
import * as aiController from '@/controllers/ai.controller';

const router = Router();

router.use(authenticate);

// POST /api/v1/ai/decode — patient decodes their own lab report
router.post(
  '/decode',
  authorize('PATIENT'),
  validate(decodeReportSchema),
  aiController.decodeReport,
);

// POST /api/v1/ai/clinical-summary — doctor requests AI summary for a patient
router.post(
  '/clinical-summary',
  authorize('DOCTOR'),
  validate(clinicalSummarySchema),
  aiController.getClinicalSummary,
);

// GET /api/v1/ai/summary/:recordId — patient or doctor fetches cached result
router.get(
  '/summary/:recordId',
  authorize('PATIENT', 'DOCTOR'),
  aiController.getCachedSummary,
);

export default router;
