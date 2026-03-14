import { Response } from 'express';
import { AuthRequest } from '@/types';
import * as clinicalService from '@/services/clinical.service';
import { Role } from '@prisma/client';

// ─── Shared error handler ─────────────────────────────────────────────────────
function handleError(res: Response, err: unknown): void {
  const e = err as Error & { statusCode?: number; pharmaIssues?: unknown };
  if (e.pharmaIssues) {
    res.status(422).json({ success: false, error: e.message, pharmaIssues: e.pharmaIssues });
    return;
  }
  res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
}

// ─── GET /clinical/patient/:uhid ──────────────────────────────────────────────
export async function getPatientProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await clinicalService.getPatientProfile(
      req.params.uhid,
      req.user!.userId
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── POST /clinical/notes ─────────────────────────────────────────────────────
export async function createClinicalNote(req: AuthRequest, res: Response): Promise<void> {
  try {
    const note = await clinicalService.createClinicalNote(req.user!.userId, req.body);
    res.status(201).json({ success: true, message: 'Clinical note created successfully', data: note });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── GET /clinical/notes/:patientUhid ────────────────────────────────────────
export async function getClinicalNotes(req: AuthRequest, res: Response): Promise<void> {
  try {
    const notes = await clinicalService.getClinicalNotes(
      req.params.patientUhid,
      req.user!.userId,
      req.user!.role as Role
    );
    res.status(200).json({ success: true, data: notes });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── GET /clinical/notes/single/:id ──────────────────────────────────────────
export async function getSingleClinicalNote(req: AuthRequest, res: Response): Promise<void> {
  try {
    const note = await clinicalService.getSingleClinicalNote(
      req.params.id,
      req.user!.userId,
      req.user!.role as Role
    );
    res.status(200).json({ success: true, data: note });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── POST /clinical/prescriptions ────────────────────────────────────────────
export async function createPrescription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await clinicalService.createPrescription(req.user!.userId, req.body);
    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      data: result,
    });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── GET /clinical/prescriptions/:patientUhid ────────────────────────────────
export async function getPrescriptions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const prescriptions = await clinicalService.getPrescriptions(
      req.params.patientUhid,
      req.user!.userId,
      req.user!.role as Role
    );
    res.status(200).json({ success: true, data: prescriptions });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── GET /clinical/prescriptions/single/:id ──────────────────────────────────
export async function getSinglePrescription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const prescription = await clinicalService.getSinglePrescription(
      req.params.id,
      req.user!.userId,
      req.user!.role as Role
    );
    res.status(200).json({ success: true, data: prescription });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── POST /clinical/pharma-check ──────────────────────────────────────────────
export async function pharmaCheck(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { patientUhid, drugs } = req.body as {
      patientUhid: string;
      drugs: Array<{ name: string; dosage: string }>;
    };

    const doctor = await import('@/lib/prisma').then(({ default: prisma }) =>
      prisma.doctor.findUnique({
        where: { userId: req.user!.userId },
        select: { id: true },
      })
    );
    if (!doctor) {
      res.status(404).json({ success: false, error: 'Doctor profile not found' });
      return;
    }

    const result = await clinicalService.runPharmaCheck(patientUhid, drugs, doctor.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
}
