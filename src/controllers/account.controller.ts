import { Request, Response, NextFunction } from 'express';
import * as accountService from '../services/account.service';
import { ok } from '../utils/response';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const account = await accountService.createAccount(req.body);
    res.status(201).json(ok(account));
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const account = await accountService.getAccountById(req.params.accountId);
    res.json(ok(account));
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = req.query as any;
    const filter = {
      userName: q.userName,
      userId: q.userId,
      accountId: q.accountId,
      inactiveDays: q.inactiveDays,
    };
    const opts = { sort: q.sort, order: q.order, page: q.page, limit: q.limit };

    const { items, total } = await accountService.listAccounts(filter, opts);
    res.json(ok(items, { page: q.page, limit: q.limit, total }));
  } catch (err) {
    next(err);
  }
}

export async function stale(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const days = (req.query as any).days;
    const accounts = await accountService.getStaleAccounts(days);
    res.json(ok(accounts));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const account = await accountService.updateAccount(req.params.accountId, req.body);
    res.json(ok(account));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await accountService.deleteAccount(req.params.accountId);
    res.json(ok({ deleted: true }));
  } catch (err) {
    next(err);
  }
}
