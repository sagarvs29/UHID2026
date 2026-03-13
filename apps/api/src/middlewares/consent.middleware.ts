import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import prisma from '@/lib/prisma';

/**
 * requireConsent middleware
 *
 * For DOCTOR and INSURANCE_PROVIDER roles: verifies there is an ACTIVE,
 * non-expired consent from the patient identified by req.params.uhid OR
 * by the patientId of the record identified by req.params.id.
 *
 * For PATIENT / HOSPITAL_STAFF / HOSPITAL_ADMIN: passes through immediately.
 *
 * Usage:
 *   router.get('/:uhid', authenticate, authorize(...), requireConsent, ...)
 *   router.get('/record/:id', authenticate, authorize(...), requireConsent, ...)
 */
export async function requireConsent(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const role = req.user?.role;

  // Only enforce for DOCTOR and INSURANCE_PROVIDER
  if (role !== 'DOCTOR' && role !== 'INSURANCE_PROVIDER') {
    next();
    return;
  }

  try {
    // ── Resolve the patientId ─────────────────────────────────────────────────
    let patientId: string | null = null;

    if (req.params.uhid) {
      const patient = await prisma.patient.findUnique({
        where: { uhid: req.params.uhid },
        select: { id: true },
      });
      patientId = patient?.id ?? null;
    } else if (req.params.id) {
      // Could be a record id — resolve from MedicalRecord
      const record = await prisma.medicalRecord.findUnique({
        where: { id: req.params.id },
        select: { patientId: true },
      });
      patientId = record?.patientId ?? null;
    }

    if (!patientId) {
      // If we can't resolve the patient, let the downstream handler return 404
      next();
      return;
    }

    // ── Resolve requestor profile id ──────────────────────────────────────────
    let doctorId: string | null = null;
    let insuranceProviderId: string | null = null;

    if (role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({
        where: { userId: req.user!.userId },
        select: { id: true },
      });
      doctorId = doctor?.id ?? null;
    } else {
      const ins = await prisma.insuranceProvider.findUnique({
        where: { userId: req.user!.userId },
        select: { id: true },
      });
      insuranceProviderId = ins?.id ?? null;
    }

    // ── Check for active, non-expired consent ─────────────────────────────────
    const consent = await prisma.consent.findFirst({
      where: {
        patientId,
        status: 'ACTIVE',
        ...(doctorId ? { doctorId } : { insuranceProviderId }),
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true, scope: true },
    });

    if (!consent) {
      res.status(403).json({
        success: false,
        error: 'Access denied. You do not have active consent to view this patient\'s records. Request consent first.',
      });
      return;
    }

    // Attach consent scope to request for downstream scope enforcement
    (req as AuthRequest & { consentScope: string[] }).consentScope = consent.scope;
    next();
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, error: e.message ?? 'Consent check failed' });
  }
}
