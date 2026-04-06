import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { errorHandler, notFound } from '@/middlewares/error.middleware';
import authRouter from '@/routes/auth.routes';
import hospitalsRouter from '@/routes/hospitals.routes';
import recordsRouter from '@/routes/records.routes';
import consentRouter from '@/routes/consent.routes';
import clinicalRouter from '@/routes/clinical.routes';
import aiRouter from '@/routes/ai.routes';
import qrRouter from '@/routes/qr.routes';
import insuranceRouter from '@/routes/insurance.routes';
import adminRouter from '@/routes/admin.routes';
import telehealthRouter from '@/routes/telehealth.routes';
import notificationsRouter from '@/routes/notifications.routes';
import logger from '@/lib/logger';

export function createApp(): Application {
  const app = express();

  // ─── Trust Railway's reverse proxy ──────────────────────
  app.set('trust proxy', 1);
  // ─── Security ───────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_URL ?? 'http://localhost:5175',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-internal-secret'],
    })
  );

  // ─── Rate limiting ──────────────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many auth attempts, try again in 15 minutes' },
  });

  app.use(globalLimiter);

  // ─── Body parsing ───────────────────────────────────────
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // ─── HTTP logging ───────────────────────────────────────
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.http(msg.trim()) },
      skip: (req) => req.path === '/health',
    })
  );

  // ─── Health check ───────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      service: 'uhid-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ─── Routes ─────────────────────────────────────────────
  app.use('/api/v1/auth', authLimiter, authRouter);
  app.use('/api/v1/hospitals', hospitalsRouter); // Public — registration dropdown
  app.use('/api/v1/records', recordsRouter);     // Phase 2 — medical records
  app.use('/api/v1/consents', consentRouter);    // Phase 3 — consent management
  app.use('/api/v1/clinical', clinicalRouter);   // Phase 4 — doctor portal & pharma-check
  app.use('/api/v1/ai', aiRouter);               // Phase 5 — AI features
  app.use('/api/v1/qr', qrRouter);               // Phase 6 — QR & Emergency access
  app.use('/api/v1/insurance', insuranceRouter);  // Phase 7 — Insurance portal
  app.use('/api/v1/admin', adminRouter);          // Phase 8 — Admin portal & Audit
  app.use('/api/v1/hospital', telehealthRouter);  // Phase 9 — Telehealth & Appointments
  app.use('/api/v1/notifications', notificationsRouter); // Phase 9 — Notifications
  // app.use('/api/patients', authenticate, patientRouter);
  // app.use('/api/doctors', authenticate, doctorRouter);
  // app.use('/api/records', authenticate, recordRouter);
  // app.use('/api/consent', authenticate, consentRouter);
  // app.use('/api/qr', qrRouter);
  // app.use('/api/appointments', authenticate, appointmentRouter);
  // app.use('/api/insurance', authenticate, insuranceRouter);
  // app.use('/api/admin', authenticate, authorize('SUPER_ADMIN'), adminRouter);
  // app.use('/api/telehealth', authenticate, telehealthRouter);
  // app.use('/api/internal', internalOnly, internalRouter);

  // ─── Serve frontend in production ─────────────────────────
  if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    const frontendDist = path.resolve(__dirname, '../../web/dist');
    app.use(express.static(frontendDist));

    // SPA fallback — any non-API route serves index.html
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  // ─── Error handling ─────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
