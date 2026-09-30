import { z } from 'zod';

export const reportFiltersSchema = z.object({
  profileId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  sourceId: z.string().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).transform((value) => ({
  ...value,
  from: value.from ?? new Date(Date.now() - 90 * 86_400_000),
  to: value.to ?? new Date(),
}));
