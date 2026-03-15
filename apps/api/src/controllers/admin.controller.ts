import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { validate } from '@/middlewares/validate.middleware';
import {
  verifyStaffSchema,
  deactivateStaffSchema,
  auditLogQuerySchema,
  hospitalActionSchema,
} from '@/validators/admin.validator';
import * as adminService from '@/services/admin.service';

// ─── Hospital Admin ───────────────────────────────────────────────────────────

export const getPendingVerifications = [
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await adminService.getPendingVerifications(req.user!.userId);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
];

export const verifyStaff = [
  validate(verifyStaffSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { action, notes } = req.body as { action: 'VERIFY' | 'REJECT' | 'REQUEST_MORE_INFO'; notes?: string };
      const data = await adminService.verifyStaff(req.user!.userId, userId, action, notes);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
];

export const deactivateStaff = [
  validate(deactivateStaffSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body as { reason: string };
      const data = await adminService.deactivateStaff(req.user!.userId, userId, reason);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
];

export const getActiveStaff = [
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await adminService.getActiveStaff(req.user!.userId);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
];

export const getHospitalAnalytics = [
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await adminService.getHospitalAnalytics(req.user!.userId);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
];

export const getAuditLogs = [
  validate(auditLogQuerySchema, 'query'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query  = req.query as unknown as import('@/validators/admin.validator').AuditLogQuery;
      const parsed = auditLogQuerySchema.parse(query);
      const data   = await adminService.getAuditLogs(req.user!.userId, req.user!.role as import('@prisma/client').Role, parsed);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
];

export const exportAuditLogs = [
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = auditLogQuerySchema.parse(req.query);
      const csv    = await adminService.exportAuditLogsCsv(
        req.user!.userId,
        req.user!.role as import('@prisma/client').Role,
        parsed,
      );
      const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (e) { next(e); }
  },
];

// ─── Super Admin ──────────────────────────────────────────────────────────────

export const listHospitals = [
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await adminService.listHospitals();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
];

export const hospitalAction = [
  validate(hospitalActionSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id }     = req.params;
      const { action, notes } = req.body as { action: 'VERIFY' | 'SUSPEND'; notes?: string };
      const data = await adminService.hospitalAction(req.user!.userId, id, action, notes);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
];

export const getPlatformAnalytics = [
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await adminService.getPlatformAnalytics();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
];
