import * as userRepo from '../../src/repositories/user.repository';
import * as cache from '../../src/cache';
import * as userService from '../../src/services/user.service';
import { NotFoundException } from '../../src/exceptions/app-exception';

jest.mock('../../src/repositories/user.repository');
jest.mock('../../src/cache');
const repo = userRepo as jest.Mocked<typeof userRepo>;
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

  repo.createUser.mockImplementation(async (d: any) => { store.push(d); return d; });
  repo.findUserById.mockImplementation(async (id: string) => store.find((u) => u.userId === id) ?? null);
  repo.findUserByAccountNumber.mockImplementation(async (n: string) => store.find((u) => u.accountNumber === n) ?? null);
  repo.findUserByRegistrationNumber.mockImplementation(async (n: string) => store.find((u) => u.registrationNumber === n) ?? null);
  repo.listUsers.mockImplementation(async () => ({ items: store, total: store.length }));
  repo.updateUser.mockImplementation(async (id: string, patch: any) => {
    const u = store.find((x) => x.userId === id); if (!u) return null; Object.assign(u, patch); return u;
  });
  repo.deleteUser.mockImplementation(async (id: string) => {
    const i = store.findIndex((x) => x.userId === id); if (i < 0) return false; store.splice(i, 1); return true;
  });
});

const sample = () => ({ fullName: 'A', accountNumber: 'A1', emailAddress: 'a@b.com', registrationNumber: 'R1', role: 'user' as const });

describe('user.service', () => {
  it('createUser generates a UUIDv7 id', async () => {
    const created = await userService.createUser(sample());
    expect(created.userId).toMatch(/-7/);
  });

  it('getUserById / getUserByAccountNumber / getUserByRegistrationNumber', async () => {
    await userService.createUser(sample());
    const byAcct = await userService.getUserByAccountNumber('A1');
    expect((await userService.getUserById(byAcct.userId)).accountNumber).toBe('A1');
    expect((await userService.getUserByRegistrationNumber('R1')).registrationNumber).toBe('R1');
  });

  it('throws NotFound for unknown lookups', async () => {
    await expect(userService.getUserById('nope')).rejects.toBeInstanceOf(NotFoundException);
    await expect(userService.getUserByAccountNumber('nope')).rejects.toBeInstanceOf(NotFoundException);
    await expect(userService.getUserByRegistrationNumber('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('list delegates unique-key filters and does plain list', async () => {
    await userService.createUser(sample());
    expect((await userService.listUsers({ accountNumber: 'A1' }, { page: 1, limit: 10 })).total).toBe(1);
    expect((await userService.listUsers({ registrationNumber: 'R1' }, { page: 1, limit: 10 })).total).toBe(1);
    expect((await userService.listUsers({}, { page: 1, limit: 10 })).total).toBe(1);
  });

  it('update + delete, NotFound when missing', async () => {
    const created = await userService.createUser(sample());
    expect((await userService.updateUser(created.userId, { fullName: 'B' })).fullName).toBe('B');
    await expect(userService.deleteUser(created.userId)).resolves.toBeUndefined();
    await expect(userService.updateUser('missing', { fullName: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(userService.deleteUser('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
