import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';

// ─── AppError ─────────────────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Prisma Error Mapper ──────────────────────────────────────────────────────

function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError,
): AppError {
  switch (error.code) {
    case 'P2002': {
      const fields = (error.meta?.target as string[])?.join(', ') || 'field';
      return new AppError(`A record with this ${fields} already exists`, 409);
    }
    case 'P2025':
      return new AppError('Record not found', 404);
    case 'P2003':
      return new AppError('Related record not found', 400);
    case 'P2014':
      return new AppError('Invalid relation data provided', 400);
    case 'P2016':
      return new AppError('Query interpretation error', 400);
    default:
      logger.error('Unhandled Prisma error', { code: error.code, error });
      return new AppError('Database operation failed', 500, false);
  }
}

// ─── Zod Error Mapper ─────────────────────────────────────────────────────────

function handleZodError(error: ZodError): AppError {
  const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
  return new AppError(`Validation failed: ${messages.join('; ')}`, 422);
}

// ─── JWT Error Mapper ─────────────────────────────────────────────────────────

function handleJwtError(error: jwt.JsonWebTokenError): AppError {
  if (error instanceof jwt.TokenExpiredError) {
    return new AppError('Token has expired', 401);
  }
  if (error instanceof jwt.NotBeforeError) {
    return new AppError('Token not yet active', 401);
  }
  return new AppError('Invalid token', 401);
}

// ─── Global Error Handler ─────────────────────────────────────────────────────

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    appError = handlePrismaError(error);
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    appError = new AppError('Invalid data provided to the database', 400);
  } else if (error instanceof ZodError) {
    appError = handleZodError(error);
  } else if (error instanceof jwt.JsonWebTokenError) {
    appError = handleJwtError(error);
  } else if (error instanceof SyntaxError && 'body' in error) {
    appError = new AppError('Invalid JSON in request body', 400);
  } else if (error instanceof Error) {
    logger.error('Unhandled error', {
      message: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    });
    appError = new AppError(
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
      500,
      false,
    );
  } else {
    appError = new AppError('An unexpected error occurred', 500, false);
  }

  if (appError.statusCode >= 500) {
    logger.error(`[${appError.statusCode}] ${appError.message}`, {
      path: req.path,
      method: req.method,
      stack: appError.stack,
    });
  } else {
    logger.warn(`[${appError.statusCode}] ${appError.message}`, {
      path: req.path,
      method: req.method,
    });
  }

  res.status(appError.statusCode).json({
    success: false,
    message: appError.message,
  });
}

// ─── 404 Handler ──────────────────────────────────────────────────────────────

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}
