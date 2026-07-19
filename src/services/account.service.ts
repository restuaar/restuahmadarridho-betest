import { v7 as uuidv7 } from 'uuid';
import * as accountRepo from '../repositories/account.repository';
import * as cache from '../cache';
import { hashPassword } from '../utils/password';
import { stableParamHash } from '../utils/param-hash';
import { NotFoundException } from '../exceptions/app-exception';
import { Account, AccountFilter, ListOptions, ListResult } from '../types';

const LIST_GEN = 'account:list:gen';
const idKey = (id: string) => `account:id:${id}`;

function toPlain(doc: any): Account {
  return typeof doc?.toJSON === 'function' ? doc.toJSON() : doc;
}

async function invalidate(accountId: string): Promise<void> {
  await cache.del(idKey(accountId));
  await cache.incr(LIST_GEN);
}

export async function createAccount(data: { userName: string; password: string; userId: string }): Promise<Account> {
  const password = await hashPassword(data.password);
  const created = await accountRepo.createAccount({
    ...data,
    password,
    accountId: uuidv7(),
    lastLoginDateTime: null,
  });
  await invalidate(created.accountId);
  return toPlain(created);
}

export async function getAccountById(accountId: string): Promise<Account> {
  const cached = await cache.get<Account>(idKey(accountId));
  if (cached) return cached;

  const doc = await accountRepo.findAccountById(accountId);
  if (!doc) throw new NotFoundException('Account not found');

  const account = toPlain(doc);
  await cache.set(idKey(accountId), account);
  return account;
}

export async function listAccounts(filter: AccountFilter, opts: ListOptions): Promise<ListResult<Account>> {
  const gen = await cache.getNumber(LIST_GEN);
  const key = `account:list:g${gen}:${stableParamHash({ ...filter, ...opts })}`;

  const cached = await cache.get<ListResult<Account>>(key);
  if (cached) return cached;

  const res = await accountRepo.listAccounts(filter, opts);
  const result = { items: res.items.map(toPlain), total: res.total };
  await cache.set(key, result);
  return result;
}

export async function getStaleAccounts(days: number): Promise<Account[]> {
  const docs = await accountRepo.findStaleAccounts(days);
  return docs.map(toPlain);
}

export async function updateAccount(accountId: string, patch: { userName?: string; password?: string }): Promise<Account> {
  const toApply: Record<string, unknown> = { ...patch };
  if (patch.password) {
    toApply.password = await hashPassword(patch.password);
  }

  const updated = await accountRepo.updateAccount(accountId, toApply);
  if (!updated) throw new NotFoundException('Account not found');

  await invalidate(accountId);
  return toPlain(updated);
}

export async function deleteAccount(accountId: string): Promise<void> {
  const existing = await accountRepo.findAccountById(accountId);
  if (!existing) throw new NotFoundException('Account not found');

  await accountRepo.deleteAccount(accountId);
  await invalidate(accountId);
}
