import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import * as TelehealthController from '@/controllers/telehealth.controller';

const router = Router();

router.use(authenticate);

// GET  /notifications           — list notifications (all roles)
// PATCH /notifications/read-all — mark all as read
// PATCH /notifications/:id/read — mark single as read
router.get(   '/',        TelehealthController.listNotifications);
router.patch( '/read-all', TelehealthController.markAllNotificationsRead);
router.patch( '/:id/read', TelehealthController.markNotificationRead);

export default router;
