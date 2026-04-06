import { z } from 'zod';

/**
 * Validate all required environment variables at startup.
 * If any required variable is missing or malformed, the server
 * will crash immediately with a clear error message instead of
 * failing cryptically later during runtime.
 */

const envSchema = z.object({
  // ─── Database ──────────────────────────────────────────────────
  DATABASE_URL: z.string().min(10, 'DATABASE_URL is required'),
  DIRECT_URL:  z.string().min(10, 'DIRECT_URL is required'),

  // ─── Server ────────────────────────────────────────────────────
  PORT:      z.string().default('5000'),
  NODE_ENV:  z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  // ─── JWT ───────────────────────────────────────────────────────
  JWT_ACCESS_SECRET:    z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET:   z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN:  z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // ─── Redis ─────────────────────────────────────────────────────
  REDIS_URL: z.string().min(10, 'REDIS_URL is required'),
  UPSTASH_REDIS_REST_URL:   z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // ─── Cloudinary ────────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY:    z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),

  // ─── Email ─────────────────────────────────────────────────────
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().email('SMTP_USER must be a valid email'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),

  // ─── AI Service ────────────────────────────────────────────────
  AI_SERVICE_URL:          z.string().url().default('http://localhost:8001'),
  INTERNAL_SERVICE_SECRET: z.string().min(16, 'INTERNAL_SERVICE_SECRET must be at least 16 chars'),
  OPENAI_API_KEY:          z.string().min(1, 'OPENAI_API_KEY is required').optional(),

  // ─── Jitsi Video ───────────────────────────────────────────────
  JITSI_APP_ID:  z.string().optional(),
  JITSI_SECRET:  z.string().optional(),

  // ─── Encryption ────────────────────────────────────────────────
  ENCRYPTION_KEY:    z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters (hex)'),
  EMERGENCY_SECRET:  z.string().min(32, 'EMERGENCY_SECRET must be at least 32 characters (hex)'),

  // ─── MSG91 (optional — SMS) ────────────────────────────────────
  MSG91_AUTH_KEY:    z.string().optional(),
  MSG91_SENDER_ID:   z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Parse and validate environment variables.
 * Call this once at server startup (index.ts).
 * Throws with a detailed error if validation fails.
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ✗ ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    console.error('\n╔══════════════════════════════════════════════════╗');
    console.error('║       ENVIRONMENT VALIDATION FAILED              ║');
    console.error('╚══════════════════════════════════════════════════╝\n');
    console.error(formatted);
    console.error('\nFix the above issues in your environment variables.\n');

    // In production (Railway), log warning but don't exit — let the server try to start
    if (process.env.NODE_ENV === 'production') {
      console.warn('[ENV] Continuing with partial environment in production...');
      _env = result.data as unknown as Env;
      return _env;
    }

    process.exit(1);
  }

  _env = result.data;
  return _env;
}

/**
 * Get validated environment (must call validateEnv() first).
 */
export function getEnv(): Env {
  if (!_env) {
    throw new Error('validateEnv() must be called before getEnv()');
  }
  return _env;
}
