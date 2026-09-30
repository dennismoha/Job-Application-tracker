import { z } from 'zod';

export const createSourceBatchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  sourceIds: z.array(z.string().min(1)).max(200).default([]),
});

export const updateSourceBatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  sourceIds: z.array(z.string().min(1)).max(200).optional(),
});
