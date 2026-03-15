/**
 * Jest global test setup for API unit tests.
 * Sets required environment variables and silences logger output.
 */

// ─── Environment variables required by services ─────────────────────────────
process.env.JWT_ACCESS_SECRET   = 'test-access-secret-512bit-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
process.env.JWT_REFRESH_SECRET  = 'test-refresh-secret-512bit-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
process.env.JWT_ACCESS_EXPIRES_IN  = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.ENCRYPTION_KEY      = 'a'.repeat(64); // 64-char hex for AES-256
process.env.INTERNAL_SERVICE_SECRET = 'test-internal-secret';
process.env.NODE_ENV            = 'test';
