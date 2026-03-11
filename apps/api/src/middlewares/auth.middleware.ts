import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { verifyAccessToken } from '@/lib/jwt';
import { redis } from '@/lib/redis';
import { Role } from '@prisma/client';

/**
 * Verifies the Bearer JWT access token in the Authorization header.
 * Attaches decoded user payload to req.user.
 * Checks Redis token blacklist (for logged-out tokens).
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.slice(7);

    // Check blacklist
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      res.status(401).json({ success: false, error: 'Token revoked' });
      return;
    }

    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      role: payload.role as Role,
      sessionId: payload.sessionId,
    };

    next();
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Invalid or expired token';
    res.status(401).json({ success: false, error: message });
  }
}

/**
 * Role-based authorization guard.
 * Usage: authorize('DOCTOR', 'HOSPITAL_ADMIN')
 */
export function authorize(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required: ${roles.join(' or ')}`,
      });
      return;
    }

    next();
  };
}

/**
 * Internal service auth — validates INTERNAL_SERVICE_SECRET header.
 * Used for AI microservice → Express API calls.
 */
export function internalOnly(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const secret = req.headers['x-internal-secret'];

  if (!secret || secret !== process.env.INTERNAL_SERVICE_SECRET) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }

  next();
}

export { verifyAccessToken };
