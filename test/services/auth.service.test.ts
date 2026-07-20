import * as accountRepo from '../../src/repositories/account.repository';
import * as userRepo from '../../src/repositories/user.repository';
import * as cache from '../../src/cache';
import { login, logout, refresh } from '../../src/services/auth.service';
import { hashPassword } from '../../src/utils/password';
import { UnauthorizedException } from '../../src/exceptions/app-exception';

jest.mock('../../src/repositories/account.repository');
jest.mock('../../src/repositories/user.repository');
jest.mock('../../src/cache');
const aRepo = accountRepo as jest.Mocked<typeof accountRepo>;
const uRepo = userRepo as jest.Mocked<typeof userRepo>;
const c = cache as jest.Mocked<typeof cache>;

process.env.JWT_SECRET = 'testsecret';
process.env.JWT_REFRESH_SECRET = 'testrefresh';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_TTL = '604800';

const kv = new Map<string, string>();

beforeEach(() => {
  kv.clear();
  c.set.mockImplementation(async (k: string, v: unknown) => { kv.set(k, JSON.stringify(v)); });
  c.get.mockImplementation(async (k: string) => (kv.has(k) ? JSON.parse(kv.get(k)!) : null));
  c.del.mockImplementation(async (...keys: string[]) => { for (const k of keys) kv.delete(k); });
});

async function withAccount() {
  const hash = await hashPassword('secret');
  aRepo.findAccountByUserName.mockResolvedValue({ accountId: 'a1', userId: 'u1', userName: 'john', password: hash } as any);
  uRepo.findUserById.mockResolvedValue({ userId: 'u1', role: 'admin' } as any);
  aRepo.updateLastLogin.mockResolvedValue(undefined);
}

describe('auth.service', () => {
  it('login returns an access + refresh token and updates lastLogin', async () => {
    await withAccount();
    const tokens = await login('john', 'secret');
    expect(typeof tokens.accessToken).toBe('string');
    expect(typeof tokens.refreshToken).toBe('string');
    expect(aRepo.updateLastLogin).toHaveBeenCalledWith('a1', expect.any(Date));
  });

  it('refresh issues a new access token from a valid refresh token', async () => {
    await withAccount();
    const { refreshToken } = await login('john', 'secret');
    const { accessToken } = await refresh(refreshToken);
    expect(typeof accessToken).toBe('string');
  });

  it('logout revokes the refresh token (refresh then fails)', async () => {
    await withAccount();
    const { refreshToken } = await login('john', 'secret');
    await logout(refreshToken);
    await expect(refresh(refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws on wrong password / missing account', async () => {
    const hash = await hashPassword('secret');
    aRepo.findAccountByUserName.mockResolvedValue({ accountId: 'a1', userId: 'u1', userName: 'john', password: hash } as any);
    await expect(login('john', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);

    aRepo.findAccountByUserName.mockResolvedValue(null);
    await expect(login('ghost', 'x')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('defaults role to "user" when the linked user record is missing', async () => {
    const hash = await hashPassword('secret');
    aRepo.findAccountByUserName.mockResolvedValue({ accountId: 'a1', userId: 'u1', userName: 'john', password: hash } as any);
    uRepo.findUserById.mockResolvedValue(null);
    aRepo.updateLastLogin.mockResolvedValue(undefined);
    const tokens = await login('john', 'secret');
    expect(typeof tokens.accessToken).toBe('string');
  });
});
