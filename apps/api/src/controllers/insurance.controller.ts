import { Response } from 'express';
import multer from 'multer';
import { AuthRequest } from '@/types';
import * as insuranceService from '@/services/insurance.service';
import { ClaimStatus, ClaimType, ConsentScope } from '@prisma/client';

// ─── Multer config (memory storage for hash verification) ────────────────────
export const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  },
});

// ─── Error helper ─────────────────────────────────────────────────────────────
function handleError(res: Response, err: unknown): void {
  const e = err as Error & { statusCode?: number; code?: string };
  const payload: Record<string, unknown> = { success: false, error: e.message };
  if (e.code) payload.code = e.code;
  res.status(e.statusCode ?? 500).json(payload);
}

// ─── POST /insurance/claims ───────────────────────────────────────────────────
export async function submitClaim(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await insuranceService.submitClaim(req.user!.userId, {
      patientUhid:   req.body.patientUhid   as string,
      policyNumber:  req.body.policyNumber  as string | undefined,
      claimType:     req.body.claimType     as ClaimType,
      diagnosis:     req.body.diagnosis     as string,
      icd10Code:     req.body.icd10Code     as string,
      admissionDate: req.body.admissionDate as string,
      dischargeDate: req.body.dischargeDate as string | undefined,
      hospitalName:  req.body.hospitalName  as string,
      claimedAmount: req.body.claimedAmount as number,
      currency:      req.body.currency      as string | undefined,
      notes:         req.body.notes         as string | undefined,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── POST /insurance/claims/:id/request-access ───────────────────────────────
export async function requestAccess(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await insuranceService.requestPatientAccess(
      req.user!.userId,
      req.params.id,
      {
        scope:        req.body.scope        as ConsentScope[],
        purpose:      req.body.purpose      as string,
        durationDays: req.body.durationDays as number,
      },
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── GET /insurance/claims/:id/records ───────────────────────────────────────
export async function getClaimRecords(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await insuranceService.getClaimPatientRecords(
      req.user!.userId,
      req.params.id,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── POST /insurance/verify-record ───────────────────────────────────────────
export async function verifyRecord(req: AuthRequest, res: Response): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(422).json({ success: false, error: 'No file uploaded' });
      return;
    }
    const recordId = req.body.recordId as string;
    if (!recordId) {
      res.status(422).json({ success: false, error: 'recordId is required' });
      return;
    }
    const data = await insuranceService.verifyRecord(
      req.user!.userId,
      recordId,
      file.buffer,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── PATCH /insurance/claims/:id/decision ────────────────────────────────────
export async function updateDecision(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await insuranceService.updateClaimDecision(
      req.user!.userId,
      req.params.id,
      {
        status:         req.body.status         as ClaimStatus,
        approvedAmount: req.body.approvedAmount as number | undefined,
        notes:          req.body.notes          as string | undefined,
        settlementDate: req.body.settlementDate as string | undefined,
      },
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── GET /insurance/claims ────────────────────────────────────────────────────
export async function listClaims(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await insuranceService.listClaims(req.user!.userId, {
      status:    req.query.status    as ClaimStatus | undefined,
      claimType: req.query.claimType as ClaimType   | undefined,
      riskLevel: req.query.riskLevel as 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | undefined,
      from:      req.query.from      as string | undefined,
      to:        req.query.to        as string | undefined,
      page:      req.query.page      ? Number(req.query.page)  : undefined,
      limit:     req.query.limit     ? Number(req.query.limit) : undefined,
    });
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── GET /insurance/claims/:id ────────────────────────────────────────────────
export async function getClaimDetail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await insuranceService.getClaimDetail(req.user!.userId, req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}
