import { Redis } from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is not set');
}

export const redis = new Redis(process.env.REDIS_URL, {
  tls: {},
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  },
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected to Upstash');
});

// ─── TTL Constants (seconds) ────────────────────────────────
export const TTL = {
  OTP: 10 * 60,           // 10 minutes
  REFRESH_TOKEN: 7 * 24 * 60 * 60, // 7 days
  QR_SESSION: 30 * 60,    // 30 minutes
  RATE_LIMIT: 60,         // 1 minute window
  BLACKLIST: 15 * 60,     // match access token expiry
} as const;

export default redis;
