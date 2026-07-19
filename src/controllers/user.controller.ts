import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { ok } from '../utils/response';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(ok(user));
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.getUserById(req.params.userId);
    res.json(ok(user));
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = req.query as any;
    const filter = {
      fullName: q.fullName,
      role: q.role,
      emailAddress: q.emailAddress,
      accountNumber: q.accountNumber,
      registrationNumber: q.registrationNumber,
      userId: q.userId,
    };
    const opts = { sort: q.sort, order: q.order, page: q.page, limit: q.limit };

    const { items, total } = await userService.listUsers(filter, opts);
    res.json(ok(items, { page: q.page, limit: q.limit, total }));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.updateUser(req.params.userId, req.body);
    res.json(ok(user));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await userService.deleteUser(req.params.userId);
    res.json(ok({ deleted: true }));
  } catch (err) {
    next(err);
  }
}
