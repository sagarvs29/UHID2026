import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Validates req[part] against a Zod schema.
 * Returns 422 with field-level errors on failure.
 */
export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const errors = (result.error as ZodError).errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      res.status(422).json({
        success: false,
        error: 'Validation failed',
        errors,
      });
      return;
    }

    req[part] = result.data;
    next();
  };
}
