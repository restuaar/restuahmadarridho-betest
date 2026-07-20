import * as accountRepo from '../../src/repositories/account.repository';
import * as cache from '../../src/cache';
import * as accountService from '../../src/services/account.service';
import { comparePassword } from '../../src/utils/password';
import { NotFoundException } from '../../src/exceptions/app-exception';

jest.mock('../../src/repositories/account.repository');
jest.mock('../../src/cache');
const repo = accountRepo as jest.Mocked<typeof accountRepo>;
const c = cache as jest.Mocked<typeof cache>;

const store: any[] = [];

beforeEach(() => {
  store.length = 0;
  const counters = new Map<string, number>();
  c.get.mockResolvedValue(null);
  c.set.mockResolvedValue(undefined);
  c.del.mockResolvedValue(undefined);
  c.incr.mockImplementation(async (k: string) => { const n = (counters.get(k) ?? 0) + 1; counters.set(k, n); return n; });
  c.getNumber.mockImplementation(async (k: string) => counters.get(k) ?? 0);

  repo.createAccount.mockImplementation(async (d: any) => { store.push(d); return d; });
  repo.findAccountById.mockImplementation(async (id: string) => store.find((a) => a.accountId === id) ?? null);
  repo.listAccounts.mockImplementation(async () => ({ items: store, total: store.length }));
  repo.findStaleAccounts.mockImplementation(async () => store.filter((a) => a.stale) as any);
  repo.updateAccount.mockImplementation(async (id: string, patch: any) => {
    const a = store.find((x) => x.accountId === id); if (!a) return null; Object.assign(a, patch); return a;
  });
  repo.deleteAccount.mockImplementation(async (id: string) => {
    const i = store.findIndex((x) => x.accountId === id); if (i < 0) return false; store.splice(i, 1); return true;
  });
});

describe('account.service', () => {
  it('createAccount hashes password and generates a UUIDv7 id', async () => {
    const created: any = await accountService.createAccount({ userName: 'john', password: 'secret', userId: 'u1' });
    expect(created.accountId).toMatch(/-7/);
    expect(created.password).not.toBe('secret');
    expect(await comparePassword('secret', store[0].password)).toBe(true);
  });

  it('updateAccount re-hashes password when changed', async () => {
    const created: any = await accountService.createAccount({ userName: 'john', password: 'secret', userId: 'u1' });
    await accountService.updateAccount(created.accountId, { password: 'newpass' });
    expect(await comparePassword('newpass', store[0].password)).toBe(true);
  });

  it('getAccountById throws NotFound when absent; getStaleAccounts delegates', async () => {
    await expect(accountService.getAccountById('nope')).rejects.toBeInstanceOf(NotFoundException);
    store.push({ accountId: 'a1', stale: true });
    expect((await accountService.getStaleAccounts(3)).length).toBe(1);
  });

  it('listAccounts + delete, NotFound when missing', async () => {
    const created: any = await accountService.createAccount({ userName: 'john', password: 'secret', userId: 'u1' });
    expect((await accountService.listAccounts({}, { page: 1, limit: 10 })).total).toBe(1);
    await expect(accountService.deleteAccount(created.accountId)).resolves.toBeUndefined();
    await expect(accountService.updateAccount('missing', { userName: 'z' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(accountService.deleteAccount('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
