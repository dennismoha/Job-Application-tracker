import { z } from 'zod';

const email = z.string().trim().email().transform((value) => value.toLowerCase());

export const registerSchema = z.object({
  email,
  name: z.string().trim().min(2).max(120).optional(),
  password: z.string().min(10).max(128),
}).transform((value) => ({
  email: value.email,
  password: value.password,
  ...(value.name !== undefined ? { name: value.name } : {}),
}));

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});
