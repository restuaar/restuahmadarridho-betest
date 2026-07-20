import { jwtAuth } from '../../src/middlewares/jwt-auth';
import { signAccessToken } from '../../src/services/token.service';
import { UnauthorizedException } from '../../src/exceptions/app-exception';

process.env.JWT_SECRET = 'testsecret';
process.env.JWT_REFRESH_SECRET = 'testrefresh';
process.env.JWT_EXPIRES_IN = '15m';

const res = () => ({ cookie: jest.fn(), setHeader: jest.fn() }) as any;

describe('jwtAuth', () => {
  it('accepts a valid access-token cookie', async () => {
    const token = signAccessToken({ sub: 'a1', userId: 'u1', role: 'admin' });
    const req: any = { cookies: { access_token: token } };
    const next = jest.fn();
    await jwtAuth(req, res(), next);
    expect(req.user.userId).toBe('u1');
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects when no access and no refresh cookie (401)', async () => {
    const req: any = { cookies: {} };
    const next = jest.fn();
    await jwtAuth(req, res(), next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when access invalid and refresh invalid (401)', async () => {
    const req: any = { cookies: { access_token: 'garbage', refresh_token: 'also-garbage' } };
    const next = jest.fn();
    await jwtAuth(req, res(), next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedException);
  });
});
