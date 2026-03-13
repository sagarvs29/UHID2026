import { Router } from 'express';
import { authenticate, authorize } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import {
  requestConsentSchema,
  approveConsentSchema,
  denyConsentSchema,
  listConsentsQuerySchema,
} from '@/validators/consent.validator';
import * as controller from '@/controllers/consent.controller';

const router = Router();

// ─── Doctor / Insurance endpoints ────────────────────────────────────────────

// POST /api/v1/consents/request — doctor or insurance requests access
router.post(
  '/request',
  authenticate,
  authorize('DOCTOR', 'INSURANCE_PROVIDER'),
  validate(requestConsentSchema),
  controller.requestConsent
);

// GET /api/v1/consents/check/:uhid — check if requester has active consent
router.get(
  '/check/:uhid',
  authenticate,
  authorize('DOCTOR', 'INSURANCE_PROVIDER'),
  controller.checkConsent
);

// ─── Patient endpoints ────────────────────────────────────────────────────────

// POST /api/v1/consents/otp/send — patient requests OTP to approve a consent
router.post(
  '/otp/send',
  authenticate,
  authorize('PATIENT'),
  controller.sendOtp
);

// POST /api/v1/consents/approve — patient approves with OTP
router.post(
  '/approve',
  authenticate,
  authorize('PATIENT'),
  validate(approveConsentSchema),
  controller.approveConsent
);

// POST /api/v1/consents/deny — patient denies a pending request
router.post(
  '/deny',
  authenticate,
  authorize('PATIENT'),
  validate(denyConsentSchema),
  controller.denyConsent
);

// GET /api/v1/consents/active — list patient's active consents
router.get(
  '/active',
  authenticate,
  authorize('PATIENT'),
  controller.getActiveConsents
);

// GET /api/v1/consents/pending — list pending consent requests waiting for patient
router.get(
  '/pending',
  authenticate,
  authorize('PATIENT'),
  controller.getPendingConsents
);

// GET /api/v1/consents/history — full consent history for patient
router.get(
  '/history',
  authenticate,
  authorize('PATIENT'),
  validate(listConsentsQuerySchema, 'query'),
  controller.getConsentHistory
);

// DELETE /api/v1/consents/:id — patient revokes an active consent
router.delete(
  '/:id',
  authenticate,
  authorize('PATIENT'),
  controller.revokeConsent
);

export default router;
