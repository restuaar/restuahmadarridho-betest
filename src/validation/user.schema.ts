import { z } from 'zod';

export const createUserSchema = z.object({
  fullName: z.string().min(1),
  accountNumber: z.string().min(1),
  emailAddress: z.string().email(),
  registrationNumber: z.string().min(1),
  role: z.enum(['admin', 'user']),
});

export const updateUserSchema = createUserSchema.partial();

export const listUserQuerySchema = z.object({
  fullName: z.string().optional(),
  role: z.enum(['admin', 'user']).optional(),
  emailAddress: z.string().optional(),
  accountNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  userId: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
