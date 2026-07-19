import { v7 as uuidv7 } from 'uuid';
import * as userRepo from '../repositories/user.repository';
import * as cache from '../cache';
import { stableParamHash } from '../utils/param-hash';
import { NotFoundException } from '../exceptions/app-exception';
import { User, UserFilter, ListOptions, ListResult } from '../types';

const LIST_GEN = 'user:list:gen';
const idKey = (id: string) => `user:id:${id}`;
const acctKey = (n: string) => `user:acct:${n}`;
const regKey = (n: string) => `user:reg:${n}`;

function toPlain(doc: any): User {
  return typeof doc?.toJSON === 'function' ? doc.toJSON() : doc;
}

async function invalidate(u: Pick<User, 'userId' | 'accountNumber' | 'registrationNumber'>): Promise<void> {
  await cache.del(idKey(u.userId), acctKey(u.accountNumber), regKey(u.registrationNumber));
  await cache.incr(LIST_GEN);
}

export async function createUser(data: Omit<User, 'userId'>): Promise<User> {
  const created = await userRepo.createUser({ ...data, userId: uuidv7() });
  const user = toPlain(created);
  await invalidate(user);
  return user;
}

export async function getUserById(userId: string): Promise<User> {
  const cached = await cache.get<User>(idKey(userId));
  if (cached) return cached;

  const doc = await userRepo.findUserById(userId);
  if (!doc) throw new NotFoundException('User not found');

  const user = toPlain(doc);
  await cache.set(idKey(userId), user);
  return user;
}

export async function getUserByAccountNumber(accountNumber: string): Promise<User> {
  const cached = await cache.get<User>(acctKey(accountNumber));
  if (cached) return cached;

  const doc = await userRepo.findUserByAccountNumber(accountNumber);
  if (!doc) throw new NotFoundException('User not found');

  const user = toPlain(doc);
  await cache.set(acctKey(accountNumber), user);
  return user;
}

export async function getUserByRegistrationNumber(registrationNumber: string): Promise<User> {
  const cached = await cache.get<User>(regKey(registrationNumber));
  if (cached) return cached;

  const doc = await userRepo.findUserByRegistrationNumber(registrationNumber);
  if (!doc) throw new NotFoundException('User not found');

  const user = toPlain(doc);
  await cache.set(regKey(registrationNumber), user);
  return user;
}

export async function listUsers(filter: UserFilter, opts: ListOptions): Promise<ListResult<User>> {
  if (filter.accountNumber) {
    return { items: [await getUserByAccountNumber(filter.accountNumber)], total: 1 };
  }
  if (filter.registrationNumber) {
    return { items: [await getUserByRegistrationNumber(filter.registrationNumber)], total: 1 };
  }

  const gen = await cache.getNumber(LIST_GEN);
  const key = `user:list:g${gen}:${stableParamHash({ ...filter, ...opts })}`;

  const cached = await cache.get<ListResult<User>>(key);
  if (cached) return cached;

  const res = await userRepo.listUsers(filter, opts);
  const result = { items: res.items.map(toPlain), total: res.total };
  await cache.set(key, result);
  return result;
}

export async function updateUser(userId: string, patch: Partial<User>): Promise<User> {
  const updated = await userRepo.updateUser(userId, patch);
  if (!updated) throw new NotFoundException('User not found');

  const user = toPlain(updated);
  await invalidate(user);
  return user;
}

export async function deleteUser(userId: string): Promise<void> {
  const existing = await userRepo.findUserById(userId);
  if (!existing) throw new NotFoundException('User not found');

  await userRepo.deleteUser(userId);
  await invalidate(toPlain(existing));
}
