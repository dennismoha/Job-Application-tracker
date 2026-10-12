import { z } from 'zod';

type WithoutUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<Required<T>[K], undefined>;
} & {
  [K in keyof T as undefined extends T[K] ? never : K]: Required<T>[K];
};

function omitUndefined<T extends Record<string, unknown>>(value: T): WithoutUndefined<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as WithoutUndefined<T>;
}

export const updateScheduleSchema = z.object({
  enabled: z.boolean().optional(),
  intervalMinutes: z.number().int().min(60).max(43200).optional(),
}).transform(omitUndefined);

export const pauseScheduleSchema = z.object({
  minutes: z.number().int().min(1).max(10080).default(1440),
});

export const listRunsQuerySchema = z.object({
  sourceId: z.string().min(1).optional(),
  status: z
    .enum([
      'QUEUED',
      'RUNNING',
      'COMPLETED',
      'PARTIAL',
      'FAILED',
      'RATE_LIMITED',
      'CHALLENGED',
      'SKIPPED',
      'CANCELLED',
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
}).transform(omitUndefined);

const crawlerConfigFields = {
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  enabled: z.boolean().default(true),
  intervalMinutes: z.number().int().min(60).max(43200).default(1440),
  keywords: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  locations: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  categories: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  subjects: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  maximumPages: z.number().int().min(1).max(100).default(5),
  maximumRequests: z.number().int().min(1).max(500).default(20),
  requestDelayMs: z.number().int().min(0).max(60000).default(2000),
};

export const crawlerConfigInputSchema = z.object(crawlerConfigFields).transform(omitUndefined);

export const crawlerConfigUpdateSchema = z.object(crawlerConfigFields).partial().transform(omitUndefined);
