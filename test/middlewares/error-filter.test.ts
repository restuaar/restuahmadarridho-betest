import { errorFilter } from '../../src/middlewares/error-filter';
import { NotFoundException } from '../../src/exceptions/app-exception';
import { ZodError, z } from 'zod';

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorFilter', () => {
  it('serializes AppException', () => {
    const res = mockRes();
    errorFilter(new NotFoundException('nope'), {} as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false, error: { code: 'NOT_FOUND', message: 'nope', details: undefined },
    });
  });

  it('maps ZodError to 400', () => {
    const res = mockRes();
    let zErr: ZodError;
    try { z.object({ a: z.string() }).parse({}); } catch (e) { zErr = e as ZodError; }
    errorFilter(zErr!, {} as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('maps mongo E11000 to 409', () => {
    const res = mockRes();
    errorFilter({ code: 11000, keyValue: { email: 'x' } } as any, {} as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('falls back to 500', () => {
    const res = mockRes();
    errorFilter(new Error('boom'), {} as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('hides the 500 message in production', () => {
    const saved = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = mockRes();
      errorFilter(new Error('leaky details'), {} as any, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: undefined },
      });
    } finally {
      process.env.NODE_ENV = saved;
    }
  });
});
