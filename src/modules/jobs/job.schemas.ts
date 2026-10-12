import { ApplicationStage, FreshnessStatus, JobStatus, JobVisibility, RemoteType, UserJobDisposition } from '@prisma/client';
import { z } from 'zod';

const queryBoolean = z.enum(['true', 'false']).transform((value) => value === 'true');

type WithoutUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<Required<T>[K], undefined>;
} & {
  [K in keyof T as undefined extends T[K] ? never : K]: Required<T>[K];
};

function omitUndefined<T extends Record<string, unknown>>(value: T): WithoutUndefined<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as WithoutUndefined<T>;
}

export const listJobsSchema = z.object({
  q: z.string().trim().max(200).optional(),
  profileId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  sourceId: z.string().min(1).optional(),
  status: z.nativeEnum(JobStatus).optional(),
  freshness: z.nativeEnum(FreshnessStatus).optional(),
  disposition: z.nativeEnum(UserJobDisposition).optional(),
  visited: queryBoolean.optional(),
  applied: queryBoolean.optional(),
  applicationStage: z.nativeEnum(ApplicationStage).optional(),
  remoteType: z.nativeEnum(RemoteType).optional(),
  addedWithinDays: z.coerce.number().int().min(1).max(365).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const updateJobStateSchema = z.object({
  disposition: z.nativeEnum(UserJobDisposition).optional(),
  visited: z.boolean().optional(),
  customExpiresAt: z.coerce.date().nullable().optional(),
  preferredCvVersionId: z.string().min(1).nullable().optional(),
}).transform(omitUndefined);

export const createJobNoteSchema = z.object({
  note: z.string().trim().min(1).max(10_000),
});

export const createManualJobSchema = z
  .object({
    title: z.string().trim().min(2).max(250),
    company: z.string().trim().min(2).max(250).optional(),
    location: z.string().trim().max(250).optional(),
    description: z.string().trim().max(100_000).optional(),
    salary: z.string().trim().max(500).optional(),
    postedAt: z.string().trim().max(100).optional(),
    expiresAt: z.string().trim().max(100).optional(),
    employmentType: z.string().trim().max(100).optional(),
    sourceId: z.string().min(1).optional(),
    url: z
      .string()
      .url()
      .refine((value) => /^https?:\/\//i.test(value), {
        message: 'Only HTTP and HTTPS job URLs are supported.',
      })
      .optional(),
    visibility: z.nativeEnum(JobVisibility).default(JobVisibility.PRIVATE),
    note: z.string().trim().max(10_000).optional(),
  })
  .refine((value) => Boolean(value.company || value.url || value.description), {
    message: 'Add a company, job URL or description so the job can be validated.',
    path: ['company'],
  });


export const updateJobSchema = z.object({
  title: z.string().trim().min(2).max(250).optional(),
  company: z.string().trim().min(2).max(250).nullable().optional(),
  location: z.string().trim().max(250).nullable().optional(),
  description: z.string().trim().max(100_000).nullable().optional(),
  salary: z.string().trim().max(500).nullable().optional(),
  postedAt: z.string().trim().max(100).nullable().optional(),
  expiresAt: z.string().trim().max(100).nullable().optional(),
  employmentType: z.string().trim().max(100).nullable().optional(),
  url: z.string().url().nullable().optional(),
}).transform(omitUndefined);

export const moveListingSchema = z.object({
  targetJobId: z.string().min(1),
});

export const addJobListingSchema = z.object({
  sourceId: z.string().min(1),
  url: z.string().url().optional(),
  isOfficial: z.boolean().default(false),
}).transform(omitUndefined);

export const changeListingSourceSchema = z.object({
  sourceId: z.string().min(1),
});

export const shareJobsSchema = z.object({
  jobIds: z.array(z.string().min(1)).min(1).max(50),
  recipients: z.array(z.string().trim().email().transform((value) => value.toLowerCase())).min(1).max(20),
  subject: z.string().trim().min(1).max(200).optional(),
  message: z.string().trim().max(5000).optional(),
}).transform((value) => ({
  jobIds: value.jobIds,
  recipients: value.recipients,
  ...(value.subject !== undefined ? { subject: value.subject } : {}),
  ...(value.message !== undefined ? { message: value.message } : {}),
}));

export const checkJobUrlSchema = z.object({
  url: z.string().trim().url().refine((value) => /^https?:\/\//i.test(value), { message: 'Only HTTP and HTTPS URLs are supported.' }),
});
