export class AppException extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestException extends AppException {
  constructor(msg = 'Bad request', details?: unknown) { super(400, 'BAD_REQUEST', msg, details); }
}
export class ValidationException extends AppException {
  constructor(msg = 'Validation failed', details?: unknown) { super(400, 'VALIDATION_ERROR', msg, details); }
}
export class UnauthorizedException extends AppException {
  constructor(msg = 'Unauthorized', details?: unknown) { super(401, 'UNAUTHORIZED', msg, details); }
}
export class ForbiddenException extends AppException {
  constructor(msg = 'Forbidden', details?: unknown) { super(403, 'FORBIDDEN', msg, details); }
}
export class NotFoundException extends AppException {
  constructor(msg = 'Not found', details?: unknown) { super(404, 'NOT_FOUND', msg, details); }
}
export class ConflictException extends AppException {
  constructor(msg = 'Conflict', details?: unknown) { super(409, 'CONFLICT', msg, details); }
}
export class InternalException extends AppException {
  constructor(msg = 'Internal server error', details?: unknown) { super(500, 'INTERNAL_ERROR', msg, details); }
}
