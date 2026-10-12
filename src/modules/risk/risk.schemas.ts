import { RiskLevel, RiskReasonType } from '@prisma/client';
import { z } from 'zod';

type WithoutUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<Required<T>[K], undefined>;
} & {
  [K in keyof T as undefined extends T[K] ? never : K]: Required<T>[K];
};

function omitUndefined<T extends Record<string, unknown>>(value: T): WithoutUndefined<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as WithoutUndefined<T>;
}

export const createRiskReportSchema = z
  .object({
    sourceId: z.string().min(1).optional(),
    companyId: z.string().min(1).optional(),
    jobId: z.string().min(1).optional(),
    level: z.nativeEnum(RiskLevel),
    reasonType: z.nativeEnum(RiskReasonType),
    reason: z.string().trim().min(3).max(10_000),
    evidenceUrl: z.string().url().optional(),
  })
  .refine((value) => [value.sourceId, value.companyId, value.jobId].filter(Boolean).length === 1, {
    message: 'A risk report must target exactly one source, company or job.',
    path: ['sourceId'],
  }).transform(omitUndefined);

export const listRiskReportsSchema = z.object({
  sourceId: z.string().min(1).optional(),
  companyId: z.string().min(1).optional(),
  jobId: z.string().min(1).optional(),
  level: z.nativeEnum(RiskLevel).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
}).transform(omitUndefined);
