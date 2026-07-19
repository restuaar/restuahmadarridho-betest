import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny } from 'zod';
import { ValidationException } from '../exceptions/app-exception';

interface Schemas { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny; }

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) Object.assign(req.query, schemas.query.parse(req.query));
      if (schemas.params) Object.assign(req.params, schemas.params.parse(req.params));
      next();
    } catch (err) {
      next(new ValidationException('Validation failed', (err as any).issues ?? err));
    }
  };
}
