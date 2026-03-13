import { Response } from 'express';
import { AuthRequest } from '@/types';
import * as consentService from '@/services/consent.service';
import { Role } from '@prisma/client';

// ─── POST /consents/request ───────────────────────────────────────────────────
export async function requestConsent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const role = req.user!.role as 'DOCTOR' | 'INSURANCE_PROVIDER';
    const result = await consentService.requestConsent(req.user!.userId, role, req.body);
    res.status(201).json({ success: true, message: 'Access request sent. Patient has been notified.', data: result });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
}

// ─── POST /consents/otp/send ──────────────────────────────────────────────────
export async function sendOtp(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { consentId } = req.body as { consentId: string };
    if (!consentId) {
      res.status(400).json({ success: false, error: 'consentId is required' });
      return;
    }
    const result = await consentService.sendConsentOtp(req.user!.userId, consentId);
    res.status(200).json({ success: true, ...result });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
}

// ─── POST /consents/approve ───────────────────────────────────────────────────
export async function approveConsent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { consentId, otp } = req.body as { consentId: string; otp: string };
    const result = await consentService.approveConsent(req.user!.userId, consentId, otp);
    res.status(200).json({ success: true, message: 'Access approved successfully.', data: result });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
}

// ─── POST /consents/deny ──────────────────────────────────────────────────────
export async function denyConsent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { consentId } = req.body as { consentId: string };
    const result = await consentService.denyConsent(req.user!.userId, consentId);
    res.status(200).json({ success: true, ...result });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
}

// ─── DELETE /consents/:id ─────────────────────────────────────────────────────
export async function revokeConsent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await consentService.revokeConsent(req.user!.userId, id);
    res.status(200).json({ success: true, message: 'Access revoked successfully.', data: result });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
}

// ─── GET /consents/active ─────────────────────────────────────────────────────
export async function getActiveConsents(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await consentService.getActiveConsents(req.user!.userId);
    res.status(200).json({ success: true, data });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
}

// ─── GET /consents/pending ────────────────────────────────────────────────────
export async function getPendingConsents(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await consentService.getPendingConsents(req.user!.userId);
    res.status(200).json({ success: true, data });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
}

// ─── GET /consents/history ────────────────────────────────────────────────────
export async function getConsentHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const data = await consentService.getConsentHistory(req.user!.userId, page, limit);
    res.status(200).json({ success: true, data });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
}

// ─── GET /consents/check/:uhid ────────────────────────────────────────────────
export async function checkConsent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const role = req.user!.role as 'DOCTOR' | 'INSURANCE_PROVIDER';
    const data = await consentService.checkConsent(req.user!.userId, role, req.params.uhid);
    res.status(200).json({ success: true, data });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
}
