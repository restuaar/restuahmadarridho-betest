import {
  AppException, BadRequestException, ValidationException, UnauthorizedException,
  ForbiddenException, NotFoundException, ConflictException, InternalException,
} from '../../src/exceptions/app-exception';

describe('AppException', () => {
  it('NotFoundException has 404 + code', () => {
    const e = new NotFoundException('user not found');
    expect(e).toBeInstanceOf(AppException);
    expect(e.statusCode).toBe(404);
    expect(e.code).toBe('NOT_FOUND');
    expect(e.message).toBe('user not found');
  });
  it('ConflictException carries details', () => {
    const e = new ConflictException('dup', { key: 'email' });
    expect(e.statusCode).toBe(409);
    expect(e.details).toEqual({ key: 'email' });
  });

  it('every subclass has a sane default message + status/code', () => {
    const cases: Array<[AppException, number, string]> = [
      [new BadRequestException(), 400, 'BAD_REQUEST'],
      [new ValidationException(), 400, 'VALIDATION_ERROR'],
      [new UnauthorizedException(), 401, 'UNAUTHORIZED'],
      [new ForbiddenException(), 403, 'FORBIDDEN'],
      [new NotFoundException(), 404, 'NOT_FOUND'],
      [new ConflictException(), 409, 'CONFLICT'],
      [new InternalException(), 500, 'INTERNAL_ERROR'],
    ];
    for (const [e, status, code] of cases) {
      expect(e).toBeInstanceOf(AppException);
      expect(e.statusCode).toBe(status);
      expect(e.code).toBe(code);
      expect(e.message.length).toBeGreaterThan(0);
    }
  });
});
