import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // If response headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // 1. PostgreSQL Exclusion Constraint Violation (23P01) - Double booking race condition caught by DB
  if (err.code === '23P01') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'This resource is already booked during the selected time.',
      statusCode: 409,
    });
  }

  // 2. PostgreSQL Unique Constraint Violation (23505) - e.g. email already exists
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'An entity with these unique credentials already exists.',
      statusCode: 409,
    });
  }

  // 3. PostgreSQL Foreign Key Violation (23503)
  if (err.code === '23503') {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Referenced entity does not exist.',
      statusCode: 404,
    });
  }

  // 4. Zod Schema Validation Error
  if (err instanceof ZodError) {
    const formattedIssues = err.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Input validation failed',
      details: formattedIssues,
      statusCode: 400,
    });
  }

  // 5. Custom AppError (NotFoundError, ConflictError, ForbiddenError, etc.)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.name || 'Error',
      message: err.message,
      details: err.details,
      statusCode: err.statusCode,
    });
  }

  // 6. JWT Errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid authentication token.',
      statusCode: 401,
    });
  }

  // 7. Unhandled Server Error - Mask database details
  console.error('Unhandled Server Error:', err);
  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred. Please try again later.' 
      : (err.message || 'Internal Server Error'),
    statusCode: 500,
  });
}
