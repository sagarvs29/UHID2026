import { Response } from 'express';
import { AuthRequest } from '@/types';
import * as qrService from '@/services/qr.service';
import { ConsentScope } from '@prisma/client';

function handleError(res: Response, err: unknown): void {
  const e = err as Error & { statusCode?: number; code?: string };
  const payload: Record<string, unknown> = { success: false, error: e.message };
  if (e.code) payload.code = e.code;
  res.status(e.statusCode ?? 500).json(payload);
}

function getIp(req: AuthRequest): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress;
}

// ─── GET /qr/emergency/:uhid — Tier 1, no auth ─────────────────────────────
export async function getPublicEmergencyData(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await qrService.getPublicEmergencyData(
      req.params.uhid,
      getIp(req),
      req.query.location as string | undefined,
    );
    res.status(200).json({ success: true, tier: 1, data });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── POST /qr/scan/doctor — Tier 2, doctor auth ────────────────────────────
export async function doctorScanQr(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await qrService.doctorScanQr(
      req.user!.userId,
      req.body.qrToken as string,
      getIp(req),
      req.query.location as string | undefined,
    );
    res.status(200).json({ success: true, tier: 2, data });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── POST /qr/generate — Tier 3, patient generates one-time QR ─────────────
export async function generateOneTimeQr(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await qrService.generateOneTimeQr(
      req.user!.userId,
      req.body.scope as ConsentScope[],
      req.body.durationMinutes as number,
      req.body.label as string | undefined,
    );
    res.status(201).json({ success: true, tier: 3, data });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── GET /qr/scan-logs — patient views QR scan history ─────────────────────
export async function getScanLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await qrService.getScanLogs(req.user!.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── POST /qr/invalidate — patient invalidates all QRs ─────────────────────
export async function invalidateQrs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await qrService.invalidateQrs(
      req.user!.userId,
      (req.body.reason as string | undefined) ?? 'Manual invalidation',
    );
    res.status(200).json({
      success: true,
      message: 'All active QR tokens invalidated. New emergency QR generated.',
      data,
    });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── POST /qr/sos — patient activates SOS ──────────────────────────────────
export async function activateSos(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await qrService.activateSos(
      req.user!.userId,
      req.body.latitude as number,
      req.body.longitude as number,
      req.body.message as string | undefined,
      getIp(req),
    );
    res.status(201).json({
      success: true,
      message: 'SOS activated. Emergency contacts and nearby hospitals notified.',
      data,
    });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── POST /emergency/override — doctor emergency override ───────────────────
export async function emergencyOverride(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await qrService.emergencyOverride(
      req.user!.userId,
      req.body.patientUhid as string,
      req.body.reasonType as string,
      req.body.reason as string,
      req.body.acknowledgement as boolean,
      getIp(req),
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}
