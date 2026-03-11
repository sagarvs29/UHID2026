/**
 * auth.routes.ts
 * All Phase 1 authentication routes.
 *
 * Public:
 *   POST   /register/patient     — Patient self-registration
 *   POST   /register/doctor      — Doctor self-registration (pending approval)
 *   POST   /register/staff       — Hospital Staff self-registration (pending approval)
 *   POST   /register/insurance   — Insurance Provider self-registration (pending Super Admin approval)
 *   POST   /login                — Login for ALL roles (same endpoint)
 *   POST   /refresh              — Refresh access token
 *   GET    /verify-email         — Verify email from link (?token=xxx)
 *   POST   /forgot-password      — Send password reset email
 *   POST   /reset-password       — Reset password with token
 *
 * Authenticated:
 *   POST   /logout               — Logout (revoke tokens)
 *   GET    /me                   — Get current user + role profile
 *   POST   /change-password      — Change password (requires current password)
 */
import { Router } from 'express';
import * as authCtrl from '@/controllers/auth.controller';
import { authenticate } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import {
  patientRegisterSchema,
  doctorRegisterSchema,
  staffRegisterSchema,
  insuranceRegisterSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '@/validators/auth.validator';

const router = Router();

// ─── Public routes ────────────────────────────────────────

// Registration — role-specific endpoints
router.post(
  '/register/patient',
  validate(patientRegisterSchema),
  authCtrl.registerPatient
);
router.post(
  '/register/doctor',
  validate(doctorRegisterSchema),
  authCtrl.registerDoctor
);
router.post(
  '/register/staff',
  validate(staffRegisterSchema),
  authCtrl.registerStaff
);
router.post(
  '/register/insurance',
  validate(insuranceRegisterSchema),
  authCtrl.registerInsurance
);

// Login (all roles)
router.post('/login', validate(loginSchema), authCtrl.login);

// Token refresh
router.post('/refresh', authCtrl.refresh);

// Email verification (link from email, token in query string)
router.get('/verify-email', validate(verifyEmailSchema, 'query'), authCtrl.verifyEmail);

// Password reset
router.post('/forgot-password', validate(forgotPasswordSchema), authCtrl.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authCtrl.resetPassword);

// ─── Authenticated routes ─────────────────────────────────

router.post('/logout', authenticate, authCtrl.logout);
router.get('/me', authenticate, authCtrl.getMe);
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authCtrl.changePassword
);

export default router;
