import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types';
import * as TelehealthService from '@/services/telehealth.service';
import {
  bookAppointmentSchema,
  cancelAppointmentSchema,
  doctorSearchSchema,
  slotQuerySchema,
  appointmentListSchema,
  submitReviewSchema,
} from '@/validators/telehealth.validator';

// ─── GET /hospital/doctors ────────────────────────────────────────────────────

export async function searchDoctors(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input  = doctorSearchSchema.parse(req.query);
    const result = await TelehealthService.searchDoctors(input);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── GET /hospital/doctors/:id/slots ─────────────────────────────────────────

export async function getDoctorSlots(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id }  = req.params;
    const input   = slotQuerySchema.parse(req.query);
    const result  = await TelehealthService.getDoctorSlots(id, input);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── POST /hospital/appointments ─────────────────────────────────────────────

export async function bookAppointment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input  = bookAppointmentSchema.parse(req.body);
    const result = await TelehealthService.bookAppointment(req.user!.userId, input);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── GET /hospital/appointments ──────────────────────────────────────────────

export async function listAppointments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const role  = req.user!.role as 'PATIENT' | 'DOCTOR';
    const input = appointmentListSchema.parse(req.query);
    const result = await TelehealthService.listAppointments(req.user!.userId, role, input);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /hospital/appointments/:id/cancel ─────────────────────────────────

export async function cancelAppointment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const role   = req.user!.role as 'PATIENT' | 'DOCTOR';
    const input  = cancelAppointmentSchema.parse(req.body);
    const result = await TelehealthService.cancelAppointment(req.user!.userId, role, id, input);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── GET /hospital/appointments/join/:id ─────────────────────────────────────

export async function getJitsiToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id }  = req.params;
    const result  = await TelehealthService.getJitsiToken(req.user!.userId, id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── POST /hospital/appointments/:id/review ───────────────────────────────────

export async function submitReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const input  = submitReviewSchema.parse(req.body);
    const result = await TelehealthService.submitReview(req.user!.userId, id, input);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── GET /notifications ───────────────────────────────────────────────────────

export async function listNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit      = Math.min(Number(req.query.limit) || 20, 50);
    const result     = await TelehealthService.listNotifications(req.user!.userId, unreadOnly, limit);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /notifications/read-all ───────────────────────────────────────────

export async function markAllNotificationsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await TelehealthService.markAllNotificationsRead(req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /notifications/:id/read ───────────────────────────────────────────

export async function markNotificationRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await TelehealthService.markNotificationRead(req.user!.userId, id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
