import { z } from 'zod';

export const upsertSourceSubscriptionSchema = z.object({
  enabled: z.boolean().default(true),
  preferredIntervalMinutes: z.number().int().min(60).max(43200).nullable().optional(),
}).transform((value) => ({
  enabled: value.enabled,
  ...(value.preferredIntervalMinutes !== undefined ? { preferredIntervalMinutes: value.preferredIntervalMinutes } : {}),
}));
