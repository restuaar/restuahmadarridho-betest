import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import {
  AppException, ValidationException, ConflictException,
  UnauthorizedException, InternalException,
} from '../exceptions/app-exception';

function toAppException(err: unknown): AppException {
  if (err instanceof AppException) return err;
  if (err instanceof ZodError) {
    return new ValidationException('Validation failed', err.issues);
  }
  if (err instanceof TokenExpiredError || err instanceof JsonWebTokenError) {
    return new UnauthorizedException('Invalid or expired token');
  }
  const anyErr = err as any;
  if (anyErr && anyErr.code === 11000) {
    return new ConflictException('Duplicate key', anyErr.keyValue);
  }
  return new InternalException();
}

export function errorFilter(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const e = toAppException(err);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(e.statusCode).json({
    success: false,
    error: {
      code: e.code,
      message: e.statusCode === 500 && isProd ? 'Internal server error' : e.message,
      details: e.details,
    },
  });
}
