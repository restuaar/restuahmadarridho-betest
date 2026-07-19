import { UserModel } from '../models/user';
import { User, UserFilter, ListOptions, ListResult } from '../types';

export function createUser(data: Partial<User>) {
  return UserModel.create(data);
}

export function findUserById(userId: string) {
  return UserModel.findOne({ userId }).exec();
}

export function findUserByAccountNumber(accountNumber: string) {
  return UserModel.findOne({ accountNumber }).exec();
}

export function findUserByRegistrationNumber(registrationNumber: string) {
  return UserModel.findOne({ registrationNumber }).exec();
}

export async function listUsers(filter: UserFilter, opts: ListOptions): Promise<ListResult<User>> {
  const query: Record<string, unknown> = {};
  if (filter.role) query.role = filter.role;
  if (filter.userId) query.userId = filter.userId;
  if (filter.emailAddress) query.emailAddress = filter.emailAddress;
  if (filter.accountNumber) query.accountNumber = filter.accountNumber;
  if (filter.registrationNumber) query.registrationNumber = filter.registrationNumber;
  if (filter.fullName) query.fullName = { $regex: filter.fullName, $options: 'i' };

  const sortField = opts.sort ?? 'createdAt';
  const sortDir = opts.order === 'asc' ? 1 : -1;
  const skip = (opts.page - 1) * opts.limit;

  const [items, total] = await Promise.all([
    UserModel.find(query).sort({ [sortField]: sortDir }).skip(skip).limit(opts.limit).exec(),
    UserModel.countDocuments(query).exec(),
  ]);
  return { items, total };
}

export function updateUser(userId: string, patch: Partial<User>) {
  return UserModel.findOneAndUpdate({ userId }, patch, { new: true, runValidators: true }).exec();
}

export async function deleteUser(userId: string): Promise<boolean> {
  const res = await UserModel.deleteOne({ userId }).exec();
  return res.deletedCount === 1;
}
