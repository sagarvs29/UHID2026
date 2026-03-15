import { Router } from 'express';
import { authenticate, authorize } from '@/middlewares/auth.middleware';
import * as TelehealthController from '@/controllers/telehealth.controller';

const router = Router();

// All telehealth routes require authentication
router.use(authenticate);

// ─── Doctor Discovery (PATIENT) ──────────────────────────────────────────────
router.get('/doctors',           authorize('PATIENT'), TelehealthController.searchDoctors);
router.get('/doctors/:id/slots', authorize('PATIENT'), TelehealthController.getDoctorSlots);

// ─── Doctor Availability & Settings (DOCTOR) ─────────────────────────────────
router.get(  '/doctor/availability', authorize('DOCTOR'), TelehealthController.getMyAvailability);
router.put(  '/doctor/availability', authorize('DOCTOR'), TelehealthController.setAvailability);
router.patch('/doctor/settings',     authorize('DOCTOR'), TelehealthController.updateDoctorSettings);

// ─── Appointments (PATIENT + DOCTOR) ─────────────────────────────────────────
router.post('/appointments',               authorize('PATIENT'),         TelehealthController.bookAppointment);
router.get( '/appointments',               authorize('PATIENT', 'DOCTOR'), TelehealthController.listAppointments);
router.patch('/appointments/:id/cancel',   authorize('PATIENT', 'DOCTOR'), TelehealthController.cancelAppointment);
router.get( '/appointments/join/:id',      authorize('PATIENT', 'DOCTOR'), TelehealthController.getJitsiToken);
router.post('/appointments/:id/review',    authorize('PATIENT'),           TelehealthController.submitReview);

export default router;
