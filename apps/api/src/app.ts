import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { errorHandler, notFound } from '@/middlewares/error.middleware';
import authRouter from '@/routes/auth.routes';
import logger from '@/lib/logger';

export function createApp(): Application {
  const app = express();

  // ─── Security ───────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
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
  app.use('/api/auth', authLimiter, authRouter);
  // Phase 2+ routes will be added here:
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

  // ─── Error handling ─────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
