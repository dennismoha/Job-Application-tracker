import { z } from 'zod';

export const createBrowserTokenSchema = z.object({
  name: z.string().trim().min(2).max(80).default('Browser extension'),
  expiresInDays: z.coerce.number().int().min(1).max(365).optional(),
});

export const captureJobSchema = z.object({
  url: z.string().url(),
  pageTitle: z.string().trim().max(500).optional(),
  selectedText: z.string().trim().max(50_000).optional(),
  pageText: z.string().trim().max(100_000).optional(),
  structuredData: z.unknown().optional(),
  action: z.enum(['SAVE', 'APPLIED']).default('SAVE'),
  note: z.string().trim().max(10_000).optional(),
  searchProfileId: z.string().min(1).optional(),
  cvVersionId: z.string().min(1).optional(),
  sourceId: z.string().min(1).optional(),
  private: z.boolean().default(false),
});

export const browserContextSchema = z.object({
  url: z.string().url(),
});


export const analyzeBrowserPageSchema = z.object({
  url: z.string().url(),
  pageTitle: z.string().trim().max(500).optional(),
  selectedText: z.string().trim().max(50_000).optional(),
  pageText: z.string().trim().max(100_000).optional(),
  structuredData: z.unknown().optional(),
});

export const compareBrowserPageSchema = analyzeBrowserPageSchema.extend({
  cvVersionId: z.string().min(1),
});

export const prepareBrowserCvSchema = captureJobSchema.extend({
  cvVersionId: z.string().min(1),
});
