import { jwtAuth } from '../../src/middlewares/jwt-auth';
import { signAccessToken } from '../../src/services/token.service';
import { UnauthorizedException } from '../../src/exceptions/app-exception';

process.env.JWT_SECRET = 'testsecret';
process.env.JWT_REFRESH_SECRET = 'testrefresh';
process.env.JWT_EXPIRES_IN = '15m';

const res = () => ({ setHeader: jest.fn() }) as any;

describe('jwtAuth', () => {
  it('accepts a valid Authorization bearer token', async () => {
    const token = signAccessToken({ sub: 'a1', userId: 'u1', role: 'admin' });
    const req: any = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
    const next = jest.fn();
    await jwtAuth(req, res(), next);
    expect(req.user.userId).toBe('u1');
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects when no access header and no refresh cookie (401)', async () => {
    const req: any = { headers: {}, cookies: {} };
    const next = jest.fn();
    await jwtAuth(req, res(), next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when access invalid and refresh cookie invalid (401)', async () => {
    const req: any = { headers: { authorization: 'Bearer garbage' }, cookies: { refresh_token: 'also-garbage' } };
    const next = jest.fn();
    await jwtAuth(req, res(), next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedException);
  });
});
