import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import { authorize }    from '@/middlewares/auth.middleware';
import * as adminCtrl   from '@/controllers/admin.controller';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// ─── Hospital Admin routes ────────────────────────────────────────────────────

const adminOnly = authorize('HOSPITAL_ADMIN');

// GET  /admin/pending-verifications
router.get('/pending-verifications', adminOnly, ...adminCtrl.getPendingVerifications);

// PATCH /admin/verify-staff/:userId
router.patch('/verify-staff/:userId', adminOnly, ...adminCtrl.verifyStaff);

// PATCH /admin/deactivate-staff/:userId
router.patch('/deactivate-staff/:userId', adminOnly, ...adminCtrl.deactivateStaff);

// GET  /admin/staff
router.get('/staff', adminOnly, ...adminCtrl.getActiveStaff);

// GET  /admin/analytics
router.get('/analytics', adminOnly, ...adminCtrl.getHospitalAnalytics);

// GET  /admin/audit-logs  (both HOSPITAL_ADMIN and SUPER_ADMIN)
router.get('/audit-logs', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), ...adminCtrl.getAuditLogs);

// GET  /admin/audit-logs/export
router.get('/audit-logs/export', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), ...adminCtrl.exportAuditLogs);

// ─── Super Admin routes ───────────────────────────────────────────────────────

const superAdminOnly = authorize('SUPER_ADMIN');

// GET  /admin/super/hospitals
router.get('/super/hospitals', superAdminOnly, ...adminCtrl.listHospitals);

// POST /admin/super/hospitals
router.post('/super/hospitals', superAdminOnly, ...adminCtrl.createHospital);

// PATCH /admin/super/hospitals/:id/verify
router.patch('/super/hospitals/:id/verify', superAdminOnly, ...adminCtrl.hospitalAction);

// DELETE /admin/super/hospitals/:id  — hard-deletes hospital + all related data
router.delete('/super/hospitals/:id', superAdminOnly, ...adminCtrl.deleteHospital);

// GET /admin/super/patients
router.get('/super/patients', superAdminOnly, ...adminCtrl.listPatients);

// DELETE /admin/super/patients/:userId  — hard-deletes patient account + all data
router.delete('/super/patients/:userId', superAdminOnly, ...adminCtrl.deletePatient);

// GET  /admin/super/analytics
router.get('/super/analytics', superAdminOnly, ...adminCtrl.getPlatformAnalytics);

// PATCH /admin/super/insurance/:userId/approve
router.patch('/super/insurance/:userId/approve', superAdminOnly, ...adminCtrl.approveInsuranceProvider);

export default router;
