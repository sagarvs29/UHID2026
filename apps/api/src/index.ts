import dotenv from 'dotenv';
import path from 'path';
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

const PORT = env.PORT ?? 5000;

async function bootstrap() {
  // Verify DB connection
  try {
    await prisma.$connect();
    logger.info('[DB] Prisma connected to Supabase PostgreSQL');
  } catch (err) {
    logger.error('[DB] Failed to connect:', err);
    process.exit(1);
  }

  // Verify Redis connection
  try {
    await redis.ping();
    logger.info('[Redis] Ping OK');
  } catch (err) {
    logger.warn('[Redis] Could not ping — continuing without Redis (OTP/sessions will fail):', (err as Error).message);
  }

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

bootstrap();
