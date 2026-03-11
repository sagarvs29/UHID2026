import { Request, Response, NextFunction } from 'express';
import logger from '@/lib/logger';

/**
 * Global error handler — must be registered LAST in Express.
 * Normalizes all thrown errors to a consistent JSON response.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Prisma known request errors
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
  ) {
    const prismaErr = err as { code: string; meta?: { field_name?: string; target?: string[] } };

    if (prismaErr.code === 'P2002') {
      const field = prismaErr.meta?.target?.[0] ?? 'field';
      res.status(409).json({
        success: false,
        error: `${field} already exists`,
      });
      return;
    }

    if (prismaErr.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Record not found' });
      return;
    }
  }

  if (err instanceof Error) {
    logger.error(`[ErrorHandler] ${req.method} ${req.path} — ${err.message}`, {
      stack: err.stack,
    });

    const statusCode =
      (err as { statusCode?: number }).statusCode ?? 500;

    res.status(statusCode).json({
      success: false,
      error:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message,
    });
    return;
  }

  logger.error('[ErrorHandler] Unknown error', { err });
  res.status(500).json({ success: false, error: 'Internal server error' });
}

/**
 * 404 handler — catches unmatched routes.
 */
export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
}
