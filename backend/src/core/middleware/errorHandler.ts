import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: (err as any).errors,
    });
  }

  // Handle Postgres Constraint Errors
  if (err.code && typeof err.code === 'string' && err.code.startsWith('23')) {
    let message = 'Database constraint error';
    if (err.code === '23505') message = 'A record with this information already exists.';
    else if (err.code === '23503') message = 'This operation cannot be completed because related records exist.';
    else if (err.code === '23514') message = 'Invalid data provided that violates system constraints.';
    else if (err.code === '23502') message = 'Required information is missing.';

    return res.status(400).json({
      success: false,
      message,
    });
  }

  console.error('Unexpected Error:', err);
  return res.status(500).json({
    success: false,
    message: 'Internal Server Error',
  });
};
