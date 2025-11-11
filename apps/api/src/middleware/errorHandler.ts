import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Global error handler middleware
 * Maps different error types to appropriate HTTP responses
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Error:', err);

  // Custom API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || [];
      return res.status(409).json({
        error: 'Resource already exists',
        details: `Duplicate value for: ${target.join(', ')}`,
      });
    }

    // Record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Resource not found',
      });
    }

    // Foreign key constraint failed
    if (err.code === 'P2003') {
      return res.status(400).json({
        error: 'Invalid reference',
        details: 'Related resource does not exist',
      });
    }
  }

  // Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      error: 'Invalid data',
      details: 'Data validation failed',
    });
  }

  // Default to 500 Internal Server Error
  return res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { 
      details: err.message,
      stack: err.stack 
    }),
  });
}

