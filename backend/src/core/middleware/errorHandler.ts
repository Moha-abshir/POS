import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.warn({ url: req.url, message: err.message }, 'Application Warning');
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    logger.warn({ url: req.url, errors: err.issues }, 'Validation Error');
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

    logger.warn({ url: req.url, code: err.code, pgMessage: err.message }, 'Database Constraint Violation');

    return res.status(400).json({
      success: false,
      message,
    });
  }

  logger.error(err, 'Unexpected Server Error');
  return res.status(500).json({
    success: false,
    message: 'Internal Server Error',
  });
};
