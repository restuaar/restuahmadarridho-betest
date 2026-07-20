import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as userRepo from '../../src/repositories/user.repository';
import * as accountRepo from '../../src/repositories/account.repository';

let mongod: MongoMemoryServer;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 120000);
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
afterEach(async () => { await mongoose.connection.dropDatabase(); });

const sampleUser = () => ({
  userId: 'u1', fullName: 'Alice', accountNumber: 'A100',
  emailAddress: 'alice@x.com', registrationNumber: 'R100', role: 'user' as const,
});

describe('user.repository', () => {
  it('createUser + findUserByAccountNumber + findUserByRegistrationNumber', async () => {
    await userRepo.createUser(sampleUser());
    expect((await userRepo.findUserByAccountNumber('A100'))?.userId).toBe('u1');
    expect((await userRepo.findUserByRegistrationNumber('R100'))?.userId).toBe('u1');
  });

  it('listUsers filters + paginates + sorts ascending', async () => {
    await userRepo.createUser(sampleUser());
    await userRepo.createUser({ ...sampleUser(), userId: 'u2', fullName: 'Bob', accountNumber: 'A200', emailAddress: 'b@x.com', registrationNumber: 'R200', role: 'admin' as const });

    expect((await userRepo.listUsers({ role: 'admin' }, { page: 1, limit: 10 })).total).toBe(1);
    expect((await userRepo.listUsers({ userId: 'u1' }, { page: 1, limit: 10 })).total).toBe(1);
    expect((await userRepo.listUsers({ emailAddress: 'b@x.com' }, { page: 1, limit: 10 })).total).toBe(1);
    expect((await userRepo.listUsers({ accountNumber: 'A100' }, { page: 1, limit: 10 })).total).toBe(1);
    expect((await userRepo.listUsers({ registrationNumber: 'R200' }, { page: 1, limit: 10 })).total).toBe(1);
    expect((await userRepo.listUsers({ fullName: 'ali' }, { page: 1, limit: 10 })).total).toBe(1);
    const asc = await userRepo.listUsers({}, { sort: 'fullName', order: 'asc', page: 1, limit: 10 });
    expect(asc.items[0].fullName).toBe('Alice');
  });

  it('updateUser + deleteUser (and null/false when missing)', async () => {
    await userRepo.createUser(sampleUser());
    expect((await userRepo.updateUser('u1', { fullName: 'Alice B' }))?.fullName).toBe('Alice B');
    expect(await userRepo.updateUser('ghost', { fullName: 'X' })).toBeNull();
    expect(await userRepo.deleteUser('u1')).toBe(true);
    expect(await userRepo.deleteUser('ghost')).toBe(false);
    expect(await userRepo.findUserById('u1')).toBeNull();
  });
});

describe('account.repository', () => {
  beforeEach(async () => {
    await accountRepo.createAccount({ accountId: 'a1', userName: 'john', password: 'h', userId: 'u1' });
    await accountRepo.createAccount({ accountId: 'a2', userName: 'jane', password: 'h', userId: 'u2' });
  });

  it('finds by accountId / userName / userId', async () => {
    expect((await accountRepo.findAccountById('a1'))?.userName).toBe('john');
    expect((await accountRepo.findAccountByUserName('jane'))?.accountId).toBe('a2');
    expect((await accountRepo.findAccountByUserId('u1'))?.accountId).toBe('a1');
  });

  it('listAccounts filters by userName / userId / accountId', async () => {
    expect((await accountRepo.listAccounts({ userName: 'john' }, { page: 1, limit: 10 })).total).toBe(1);
    expect((await accountRepo.listAccounts({ userId: 'u2' }, { page: 1, limit: 10 })).total).toBe(1);
    expect((await accountRepo.listAccounts({ accountId: 'a1' }, { page: 1, limit: 10 })).total).toBe(1);
  });

  it('updateLastLogin then inactiveDays filter finds it', async () => {
    await accountRepo.updateLastLogin('a1', new Date(Date.now() - 10 * 86400000));
    const res = await accountRepo.listAccounts({ inactiveDays: 3 }, { page: 1, limit: 10 });
    expect(res.items.map((r) => r.accountId)).toEqual(['a1']);
  });

  it('updateAccount + deleteAccount (and null/false when missing)', async () => {
    expect((await accountRepo.updateAccount('a1', { userName: 'johnny' }))?.userName).toBe('johnny');
    expect(await accountRepo.updateAccount('ghost', { userName: 'z' })).toBeNull();
    expect(await accountRepo.deleteAccount('a1')).toBe(true);
    expect(await accountRepo.deleteAccount('ghost')).toBe(false);
  });

  it('findStaleAccounts returns only logins older than N days', async () => {
    await accountRepo.updateLastLogin('a1', new Date(Date.now() - 5 * 86400000));
    await accountRepo.updateLastLogin('a2', new Date(Date.now() - 1 * 86400000));
    const stale = await accountRepo.findStaleAccounts(3);
    expect(stale.map((s) => s.accountId)).toEqual(['a1']);
  });
});
