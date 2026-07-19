import { AccountModel } from '../models/account';
import { Account, AccountFilter, ListOptions, ListResult } from '../types';

function cutoff(days: number): Date {
  return new Date(Date.now() - days * 86400000);
}

export function createAccount(data: Partial<Account>) {
  return AccountModel.create(data);
}

export function findAccountById(accountId: string) {
  return AccountModel.findOne({ accountId }).exec();
}

export function findAccountByUserName(userName: string) {
  return AccountModel.findOne({ userName }).exec();
}

export function findAccountByUserId(userId: string) {
  return AccountModel.findOne({ userId }).exec();
}

export async function listAccounts(filter: AccountFilter, opts: ListOptions): Promise<ListResult<Account>> {
  const query: Record<string, unknown> = {};
  if (filter.userName) query.userName = filter.userName;
  if (filter.userId) query.userId = filter.userId;
  if (filter.accountId) query.accountId = filter.accountId;
  if (filter.inactiveDays !== undefined) query.lastLoginDateTime = { $lt: cutoff(filter.inactiveDays) };

  const sortField = opts.sort ?? 'createdAt';
  const sortDir = opts.order === 'asc' ? 1 : -1;
  const skip = (opts.page - 1) * opts.limit;

  const [items, total] = await Promise.all([
    AccountModel.find(query).sort({ [sortField]: sortDir }).skip(skip).limit(opts.limit).exec(),
    AccountModel.countDocuments(query).exec(),
  ]);
  return { items, total };
}

export function findStaleAccounts(days: number) {
  return AccountModel.find({ lastLoginDateTime: { $ne: null, $lt: cutoff(days) } })
    .sort({ lastLoginDateTime: 1 }).exec();
}

export async function updateLastLogin(accountId: string, when: Date): Promise<void> {
  await AccountModel.updateOne({ accountId }, { lastLoginDateTime: when }).exec();
}

export function updateAccount(accountId: string, patch: Partial<Account>) {
  return AccountModel.findOneAndUpdate({ accountId }, patch, { new: true, runValidators: true }).exec();
}

export async function deleteAccount(accountId: string): Promise<boolean> {
  const res = await AccountModel.deleteOne({ accountId }).exec();
  return res.deletedCount === 1;
}
