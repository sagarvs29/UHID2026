import { Response, NextFunction } from 'express';
import { uploadRecordSchema, getRecordsQuerySchema } from '@/validators/records.validator';
import * as recordsService from '@/services/records.service';
import prisma from '@/lib/prisma';
import type { AuthRequest } from '@/types';

// ─── POST /api/v1/records/upload ─────────────────────────────────────────────
// Auth: HOSPITAL_STAFF only
export async function uploadRecord(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = uploadRecordSchema.parse(req.body);
    const file = req.file!; // guaranteed by handleUpload middleware

    // Resolve staff profile and hospitalId from the authenticated userId
    const staff = await prisma.hospitalStaff.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true, hospitalId: true },
    });
    if (!staff) {
      res.status(404).json({ success: false, error: 'Staff profile not found' });
      return;
    }

    const record = await recordsService.uploadRecord({
      patientUhid: body.patientUhid,
      recordType: body.recordType,
      subType: body.subType,
      title: body.title,
      description: body.description,
      recordDate: body.recordDate,
      tags: body.tags,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedByStaffId: staff.id,
      hospitalId: staff.hospitalId,
    });

    res.status(201).json({
      success: true,
      message: 'Medical record uploaded successfully.',
      data: record,
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/records/:uhid ────────────────────────────────────────────────
// Auth: PATIENT (own) | DOCTOR (with consent — Phase 3)
export async function getRecords(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { uhid } = req.params;
    const query = getRecordsQuerySchema.parse(req.query);

    // Resolve the patient
    const patient = await prisma.patient.findUnique({
      where: { uhid },
      select: { id: true, userId: true },
    });
    if (!patient) {
      res.status(404).json({ success: false, error: 'Patient not found' });
      return;
    }

    // Access control: patients can only see their own records
    if (req.user!.role === 'PATIENT' && patient.userId !== req.user!.userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const result = await recordsService.getPatientRecords(patient.id, query);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/records/record/:id ──────────────────────────────────────────
// Auth: PATIENT (own) | DOCTOR (with consent — Phase 3)
export async function getRecord(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    // For patients — pass their patientId to enforce ownership check in service
    let requestorPatientId: string | undefined;
    if (req.user!.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user!.userId },
        select: { id: true },
      });
      requestorPatientId = patient?.id;
    }

    const record = await recordsService.getRecordById(id, requestorPatientId);
    res.status(200).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/records/record/:id/download ─────────────────────────────────
// Auth: PATIENT (own) | DOCTOR (with consent — Phase 3)
export async function downloadRecord(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    let requestorPatientId: string | undefined;
    if (req.user!.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user!.userId },
        select: { id: true },
      });
      requestorPatientId = patient?.id;
    }

    const result = await recordsService.getDownloadUrl(id, requestorPatientId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
