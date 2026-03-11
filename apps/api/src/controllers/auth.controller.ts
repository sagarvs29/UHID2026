/**
 * auth.controller.ts
 * HTTP layer for Phase 1 Auth.
 * Controllers are thin: parse → call service → respond.
 * All business logic lives in auth.service.ts.
 */
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import * as authService from '@/services/auth.service';
import {
  loginSchema,
  patientRegisterSchema,
  doctorRegisterSchema,
  staffRegisterSchema,
  insuranceRegisterSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '@/validators/auth.validator';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/register/patient
// ─────────────────────────────────────────────────────────────────────────────
export async function registerPatient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = patientRegisterSchema.parse(req.body);
    const result = await authService.registerPatient(data);
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email to activate your account.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/register/doctor
// ─────────────────────────────────────────────────────────────────────────────
export async function registerDoctor(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = doctorRegisterSchema.parse(req.body);
    const result = await authService.registerDoctor(data);
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email. Your account will be active after Hospital Admin approval.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/register/staff
// ─────────────────────────────────────────────────────────────────────────────
export async function registerStaff(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = staffRegisterSchema.parse(req.body);
    const result = await authService.registerStaff(data);
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email. Your account will be active after Hospital Admin approval.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/register/insurance
// ─────────────────────────────────────────────────────────────────────────────
export async function registerInsurance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = insuranceRegisterSchema.parse(req.body);
    const result = await authService.registerInsuranceProvider(data);
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email. Your account will be active after Super Admin approval.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/login  (same endpoint for ALL roles)
// ─────────────────────────────────────────────────────────────────────────────
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.loginUser(data);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/refresh
// ─────────────────────────────────────────────────────────────────────────────
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      res.status(400).json({ success: false, error: 'refreshToken is required' });
      return;
    }
    const tokens = await authService.refreshTokens(refreshToken);
    res.status(200).json({ success: true, data: tokens });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/logout  [authenticated]
// ─────────────────────────────────────────────────────────────────────────────
export async function logout(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId, sessionId, role } = req.user!;
    const accessToken = req.headers.authorization!.slice(7);
    await authService.logout(userId, sessionId, accessToken, role);
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/auth/verify-email?token=xxx
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token } = verifyEmailSchema.parse(req.query);
    await authService.verifyEmail(token);
    res.status(200).json({ success: true, message: 'Email verified successfully!' });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(email);
    // Always success — don't reveal whether email exists
    res.status(200).json({
      success: true,
      message: 'If that email is registered, a password reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, newPassword);
    res.status(200).json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/change-password  [authenticated]
// ─────────────────────────────────────────────────────────────────────────────
export async function changePassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user!.userId, currentPassword, newPassword);
    res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/auth/me  [authenticated]
// ─────────────────────────────────────────────────────────────────────────────
export async function getMe(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await authService.getMe(req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
