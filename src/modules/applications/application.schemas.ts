import { ApplicationEventType, ApplicationStage } from '@prisma/client';
import { z } from 'zod';

type WithoutUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<Required<T>[K], undefined>;
} & {
  [K in keyof T as undefined extends T[K] ? never : K]: Required<T>[K];
};

function omitUndefined<T extends Record<string, unknown>>(value: T): WithoutUndefined<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as WithoutUndefined<T>;
}

export const listApplicationsSchema = z.object({
  stage: z.nativeEnum(ApplicationStage).optional(),
  profileId: z.string().min(1).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
}).transform(omitUndefined);

export const createApplicationSchema = z.object({
  jobId: z.string().min(1),
  searchProfileId: z.string().min(1).optional(),
  sourceListingId: z.string().min(1).optional(),
  foundSourceId: z.string().min(1).optional(),
  appliedSourceId: z.string().min(1).optional(),
  cvVersionId: z.string().min(1).optional(),
  appliedAt: z.coerce.date().optional(),
  whereAppliedUrl: z.string().url().optional(),
  note: z.string().trim().max(10_000).optional(),
}).transform(omitUndefined);

export const updateApplicationStageSchema = z.object({
  stage: z.nativeEnum(ApplicationStage),
  occurredAt: z.coerce.date().optional(),
  note: z.string().trim().max(10_000).optional(),
}).transform(omitUndefined);

export const createApplicationEventSchema = z.object({
  type: z.nativeEnum(ApplicationEventType),
  occurredAt: z.coerce.date().optional(),
  note: z.string().trim().max(10_000).optional(),
}).transform(omitUndefined);

export const createApplicationNoteSchema = z.object({
  note: z.string().trim().min(1).max(10_000),
});

export const updateApplicationAttributionSchema = z.object({
  foundSourceId: z.string().min(1).nullable().optional(),
  appliedSourceId: z.string().min(1).nullable().optional(),
}).transform(omitUndefined);
