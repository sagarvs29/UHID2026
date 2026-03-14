import { Response } from 'express';
import { AuthRequest } from '@/types';
import * as aiService from '@/services/ai.service';
import { Role } from '@prisma/client';

function handleError(res: Response, err: unknown): void {
  const e = err as Error & { statusCode?: number };
  res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
}

// ─── POST /ai/decode ────────────────────────────────────────────────────────
export async function decodeReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await aiService.decodeReport(req.user!.userId, req.body.recordId as string);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── POST /ai/clinical-summary ───────────────────────────────────────────────
export async function getClinicalSummary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await aiService.getClinicalSummary(
      req.user!.userId,
      req.body.patientUhid as string,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── GET /ai/summary/:recordId ───────────────────────────────────────────────
export async function getCachedSummary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await aiService.getCachedSummary(
      req.user!.userId,
      req.user!.role as Role,
      req.params.recordId,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}
