import { z } from 'zod';

export const analyzeJobSchema = z.object({
  profileId: z.string().min(1),
});
