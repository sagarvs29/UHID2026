import { Router } from 'express';
import * as authCtrl from '@/controllers/auth.controller';
import { authenticate } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import {
  registerSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '@/validators/auth.validator';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), authCtrl.register);
router.post('/login', validate(loginSchema), authCtrl.login);
router.post('/refresh', authCtrl.refresh);
router.post('/send-otp', validate(sendOtpSchema), authCtrl.sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), authCtrl.verifyOtp);
router.post('/forgot-password', validate(forgotPasswordSchema), authCtrl.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authCtrl.resetPassword);

// Protected routes
router.get('/me', authenticate, authCtrl.getMe);
router.post('/logout', authenticate, authCtrl.logout);
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authCtrl.changePassword
);

export default router;
