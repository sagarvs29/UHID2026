import { Router } from 'express';
import { authenticate, authorize } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import {
  doctorScanSchema,
  generateQrSchema,
  invalidateQrSchema,
  sosSchema,
  emergencyOverrideSchema,
} from '@/validators/qr.validator';
import * as qrController from '@/controllers/qr.controller';

const router = Router();

// ─── Public (no auth required) ───────────────────────────────────────────────

// GET /api/v1/qr/emergency/:uhid — Tier 1 public emergency data
router.get('/emergency/:uhid', qrController.getPublicEmergencyData);

// ─── Authenticated routes ────────────────────────────────────────────────────

router.use(authenticate);

// POST /api/v1/qr/scan/doctor — Tier 2 doctor scan (full clinical)
router.post(
  '/scan/doctor',
  authorize('DOCTOR'),
  validate(doctorScanSchema),
  qrController.doctorScanQr,
);

// POST /api/v1/qr/generate — Tier 3 patient one-time share
router.post(
  '/generate',
  authorize('PATIENT'),
  validate(generateQrSchema),
  qrController.generateOneTimeQr,
);

// GET /api/v1/qr/scan-logs — patient views their QR scan history
router.get(
  '/scan-logs',
  authorize('PATIENT'),
  qrController.getScanLogs,
);

// POST /api/v1/qr/invalidate — patient invalidates all active QRs
router.post(
  '/invalidate',
  authorize('PATIENT'),
  validate(invalidateQrSchema),
  qrController.invalidateQrs,
);

// POST /api/v1/qr/sos — patient activates SOS
router.post(
  '/sos',
  authorize('PATIENT'),
  validate(sosSchema),
  qrController.activateSos,
);

// POST /api/v1/qr/emergency/override — doctor emergency override
router.post(
  '/emergency/override',
  authorize('DOCTOR'),
  validate(emergencyOverrideSchema),
  qrController.emergencyOverride,
);

export default router;
