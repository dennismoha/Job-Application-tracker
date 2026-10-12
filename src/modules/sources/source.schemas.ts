import { CollectionCapability, SourceType } from '@prisma/client';
import { z } from 'zod';

const sourceUrl = z.string().trim().url().max(2048).refine((value) => /^https?:\/\//i.test(value), {
  message: 'Only HTTP and HTTPS URLs are supported.',
});

type WithoutUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<Required<T>[K], undefined>;
} & {
  [K in keyof T as undefined extends T[K] ? never : K]: Required<T>[K];
};

function omitUndefined<T extends Record<string, unknown>>(value: T): WithoutUndefined<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as WithoutUndefined<T>;
}

export const analyzeSourceSchema = z.object({
  url: sourceUrl,
});

export const verifySourceSchema = z.object({ url: sourceUrl });

export const createSourceSchema = z.object({
  name: z.string().trim().min(2).max(160),
  baseUrl: sourceUrl,
  careersUrl: sourceUrl.nullable().optional(),
  sourceType: z.nativeEnum(SourceType).default(SourceType.OTHER),
  collectionCapability: z.nativeEnum(CollectionCapability).optional(),
  defaultIntervalMinutes: z.number().int().min(60).max(43200).default(1440),
  auditNow: z.boolean().default(true),
}).transform(omitUndefined);

export const updateSourceSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  baseUrl: sourceUrl.optional(),
  careersUrl: sourceUrl.nullable().optional(),
  sourceType: z.nativeEnum(SourceType).optional(),
  collectionCapability: z.nativeEnum(CollectionCapability).optional(),
  accessState: z.enum(['UNKNOWN', 'OPEN', 'REQUIRES_LOGIN', 'CHALLENGED', 'BLOCKED']).optional(),
  defaultIntervalMinutes: z.number().int().min(60).max(43200).optional(),
  minimumRequestDelayMs: z.number().int().min(250).max(60000).optional(),
  maxRequestsPerRun: z.number().int().min(1).max(500).optional(),
  emailAlertsAvailable: z.boolean().optional(),
  emailAlertsUrl: sourceUrl.nullable().optional(),
  accountUrl: sourceUrl.nullable().optional(),
  active: z.boolean().optional(),
}).transform(omitUndefined);

export const listSourcesQuerySchema = z.object({
  collectionCapability: z.nativeEnum(CollectionCapability).optional(),
  sourceType: z.nativeEnum(SourceType).optional(),
  active: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  q: z.string().trim().min(1).max(100).optional(),
}).transform(omitUndefined);

export const resolveSourceSchema = z.object({ url: sourceUrl });
