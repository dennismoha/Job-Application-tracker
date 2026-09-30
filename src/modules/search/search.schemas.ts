import { z } from 'zod';

export const webSearchSchema = z.object({
  query: z.string().trim().min(3).max(500),
  profileId: z.string().min(1).optional(),
  countryCode: z.string().trim().min(2).max(2).optional(),
  languageCode: z.string().trim().min(2).max(5).default('en'),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});
