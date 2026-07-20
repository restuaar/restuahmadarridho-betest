jest.mock('../../src/cache');
import * as cache from '../../src/cache';
import * as token from '../../src/services/token.service';
import { InternalException, UnauthorizedException } from '../../src/exceptions/app-exception';

const c = cache as jest.Mocked<typeof cache>;
const kv = new Map<string, string>();
const payload = { sub: 'a1', userId: 'u1', role: 'admin' };

beforeEach(() => {
  kv.clear();
  c.set.mockImplementation(async (k: string, v: unknown) => { kv.set(k, JSON.stringify(v)); });
  c.get.mockImplementation(async (k: string) => (kv.has(k) ? JSON.parse(kv.get(k)!) : null));
  c.del.mockImplementation(async (...keys: string[]) => { for (const k of keys) kv.delete(k); });

  process.env.JWT_SECRET = 's';
  process.env.JWT_REFRESH_SECRET = 'r';
  // Leave expiry/ttl unset to exercise the default branches.
  delete process.env.JWT_EXPIRES_IN;
  delete process.env.JWT_REFRESH_TTL;
});

describe('token.service', () => {
  it('issues, verifies, refreshes and revokes (default ttl/expiry)', async () => {
    const { accessToken, refreshToken } = await token.issueTokens(payload);
    expect(token.verifyAccessToken(accessToken).userId).toBe('u1');
    expect((await token.verifyRefreshToken(refreshToken)).sub).toBe('a1');
    expect(typeof (await token.refreshAccessToken(refreshToken))).toBe('string');

    await token.revokeRefreshToken(refreshToken);
    await expect(token.verifyRefreshToken(refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokeRefreshToken silently ignores invalid tokens', async () => {
    await expect(token.revokeRefreshToken('garbage')).resolves.toBeUndefined();
  });

  it('throws InternalException when the access secret is missing', () => {
    delete process.env.JWT_SECRET;
    expect(() => token.signAccessToken(payload)).toThrow(InternalException);
  });

  it('throws InternalException when the refresh secret is missing', async () => {
    delete process.env.JWT_REFRESH_SECRET;
    await expect(token.issueTokens(payload)).rejects.toBeInstanceOf(InternalException);
  });
});
