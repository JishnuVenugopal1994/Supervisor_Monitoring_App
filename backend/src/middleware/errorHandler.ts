import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ConflictError } from '../errors/ConflictError';
import { BadRequestError } from '../errors/BadRequestError';

function isPrismaNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2025'
  );
}

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', issues: err.flatten().fieldErrors });
    return;
  }

  if (err instanceof BadRequestError) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message, code: err.code, conflicts: err.conflicts });
    return;
  }

  if (isPrismaNotFoundError(err)) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }

  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err instanceof Error
      ? err.message
      : 'Internal server error';

  res.status(500).json({ error: message });
};
