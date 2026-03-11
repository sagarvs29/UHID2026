import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import * as authService from '@/services/auth.service';
import {
  registerSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '@/validators/auth.validator';

// POST /api/auth/register
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.registerUser(data);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
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

// POST /api/auth/refresh
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    if (!refreshToken) {
      res
        .status(400)
        .json({ success: false, error: 'refreshToken is required' });
      return;
    }
    const tokens = await authService.refreshTokens(refreshToken);
    res.status(200).json({ success: true, data: tokens });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout
export async function logout(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId, sessionId } = req.user!;
    const token = req.headers.authorization!.slice(7);
    await authService.logout(userId, sessionId, token);
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/send-otp
export async function sendOtp(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = sendOtpSchema.parse(req.body);
    const identifier = data.email ?? data.phone!;
    const type = data.email ? 'email' : 'phone';
    await authService.sendOtp(identifier, type, data.purpose);
    res.status(200).json({ success: true, message: 'OTP sent' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/verify-otp
export async function verifyOtp(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = verifyOtpSchema.parse(req.body);
    const identifier = data.email ?? data.phone!;
    const valid = await authService.verifyOtp(identifier, data.otp, data.purpose);
    if (!valid) {
      res
        .status(400)
        .json({ success: false, error: 'Invalid or expired OTP' });
      return;
    }
    res.status(200).json({ success: true, message: 'OTP verified' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/forgot-password
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(email);
    // Always success — don't reveal email existence
    res.status(200).json({
      success: true,
      message: 'If that email is registered, a reset link has been sent',
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, newPassword);
    res
      .status(200)
      .json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/change-password  (authenticated)
export async function changePassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { currentPassword, newPassword } =
      changePasswordSchema.parse(req.body);
    await authService.changePassword(
      req.user!.userId,
      currentPassword,
      newPassword
    );
    res
      .status(200)
      .json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me  (authenticated)
export async function getMe(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}
