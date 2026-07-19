import { z } from 'zod';

export const createAccountSchema = z.object({
  userName: z.string().min(1),
  password: z.string().min(6),
  userId: z.string().min(1),
});

export const updateAccountSchema = z.object({
  userName: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
}).partial();

export const listAccountQuerySchema = z.object({
  userName: z.string().optional(),
  userId: z.string().optional(),
  accountId: z.string().optional(),
  inactiveDays: z.coerce.number().int().min(0).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const staleQuerySchema = z.object({
  days: z.coerce.number().int().min(0).default(3),
});
