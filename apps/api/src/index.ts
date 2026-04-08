import dotenv from 'dotenv';
import path from 'path';
// Load .env file if present (development only — Railway injects env vars directly)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ─── Validate env vars immediately ──────────────────────────────
import { validateEnv } from './lib/env';
const env = validateEnv();

import http from 'http';
import { createApp } from './app';
import { initSocket } from './lib/socket';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import logger from './lib/logger';
import { expireStaleConsents } from './services/consent.service';
import { verifySmtp } from './lib/email';

// Railway assigns its own PORT — always prefer process.env.PORT
const PORT = process.env.PORT ?? env.PORT ?? 5000;

async function bootstrap() {
  // Verify DB connection
  try {
    await prisma.$connect();
    logger.info('[DB] Prisma connected to Supabase PostgreSQL');
  } catch (err) {
    logger.error('[DB] Failed to connect:', err);
    logger.warn('[DB] Server will start but database operations will fail. Check DATABASE_URL.');
  }

  // Verify Redis connection
  try {
    await redis.ping();
    logger.info('[Redis] Ping OK');
  } catch (err) {
    logger.warn('[Redis] Could not ping — continuing without Redis (OTP/sessions will fail):', (err as Error).message);
  }

  // Verify SMTP — now that dotenv is loaded, transporter reads correct credentials
  verifySmtp();

  const app = createApp();
  const httpServer = http.createServer(app);

  // Initialize Socket.io
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    logger.info(`[Server] UHID API running on http://localhost:${PORT}`);
    logger.info(`[Server] Environment: ${process.env.NODE_ENV}`);
    logger.info(`[Server] Health: http://localhost:${PORT}/health`);
  });

  // ─── Consent expiry cron (every 15 minutes) ──────────────
  setInterval(async () => {
    try {
      const count = await expireStaleConsents();
      if (count > 0) logger.info(`[Cron] Expired ${count} stale consent(s)`);
    } catch (err) {
      logger.error('[Cron] Consent expiry failed:', err);
    }
  }, 15 * 60 * 1000);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`[Server] ${signal} received — shutting down gracefully`);
    httpServer.close(async () => {
      await prisma.$disconnect();
      redis.disconnect();
      logger.info('[Server] Shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('[Server] Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    logger.error('[Server] Uncaught Exception:', err);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('[FATAL] Bootstrap failed:', err);
  process.exit(1);
});
