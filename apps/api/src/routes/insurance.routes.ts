import { Router } from 'express';
import { authenticate, authorize } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import {
  submitClaimSchema,
  requestAccessSchema,
  claimDecisionSchema,
  listClaimsSchema,
} from '@/validators/insurance.validator';
import * as insuranceController from '@/controllers/insurance.controller';

const router = Router();

// All insurance routes require authentication + INSURANCE_PROVIDER role
router.use(authenticate);
router.use(authorize('INSURANCE_PROVIDER'));

// ─── POST /api/v1/insurance/claims ────────────────────────────────────────────
router.post(
  '/claims',
  validate(submitClaimSchema),
  insuranceController.submitClaim,
);

// ─── POST /api/v1/insurance/claims/:id/request-access ────────────────────────
router.post(
  '/claims/:id/request-access',
  validate(requestAccessSchema),
  insuranceController.requestAccess,
);

// ─── GET /api/v1/insurance/claims/:id/records ─────────────────────────────────
router.get(
  '/claims/:id/records',
  insuranceController.getClaimRecords,
);

// ─── POST /api/v1/insurance/verify-record ─────────────────────────────────────
router.post(
  '/verify-record',
  insuranceController.upload.single('file'),
  insuranceController.verifyRecord,
);

// ─── PATCH /api/v1/insurance/claims/:id/decision ──────────────────────────────
router.patch(
  '/claims/:id/decision',
  validate(claimDecisionSchema),
  insuranceController.updateDecision,
);

// ─── GET /api/v1/insurance/claims ─────────────────────────────────────────────
router.get(
  '/claims',
  validate(listClaimsSchema, 'query'),
  insuranceController.listClaims,
);

// ─── GET /api/v1/insurance/claims/:id ─────────────────────────────────────────
router.get(
  '/claims/:id',
  insuranceController.getClaimDetail,
);

export default router;
