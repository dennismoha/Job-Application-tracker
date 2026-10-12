import { z } from 'zod';

type WithoutUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<Required<T>[K], undefined>;
} & {
  [K in keyof T as undefined extends T[K] ? never : K]: Required<T>[K];
};

function omitUndefined<T extends Record<string, unknown>>(value: T): WithoutUndefined<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as WithoutUndefined<T>;
}

export const reportFiltersSchema = z.object({
  profileId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  sourceId: z.string().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).transform((value) => ({
  ...omitUndefined(value),
  from: value.from ?? new Date(Date.now() - 90 * 86_400_000),
  to: value.to ?? new Date(),
}));
