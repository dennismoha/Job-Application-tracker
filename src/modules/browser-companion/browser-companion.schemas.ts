import { z } from 'zod';

type WithoutUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<Required<T>[K], undefined>;
} & {
  [K in keyof T as undefined extends T[K] ? never : K]: Required<T>[K];
};

function omitUndefined<T extends Record<string, unknown>>(value: T): WithoutUndefined<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as WithoutUndefined<T>;
}

export const createBrowserTokenSchema = z.object({
  name: z.string().trim().min(2).max(80).default('Browser extension'),
  expiresInDays: z.coerce.number().int().min(1).max(365).optional(),
}).transform(omitUndefined);

const captureJobFields = {
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
};

export const captureJobSchema = z.object(captureJobFields).transform(omitUndefined);

export const browserContextSchema = z.object({
  url: z.string().url(),
});

const analyzeBrowserPageFields = {
  url: z.string().url(),
  pageTitle: z.string().trim().max(500).optional(),
  selectedText: z.string().trim().max(50_000).optional(),
  pageText: z.string().trim().max(100_000).optional(),
  structuredData: z.unknown().optional(),
};

export const analyzeBrowserPageSchema = z.object(analyzeBrowserPageFields).transform(omitUndefined);

export const compareBrowserPageSchema = z.object({
  ...analyzeBrowserPageFields,
  cvVersionId: z.string().min(1),
}).transform(omitUndefined);

export const prepareBrowserCvSchema = z.object({
  ...captureJobFields,
  cvVersionId: z.string().min(1),
}).transform(omitUndefined);

const compactCandidateSchema = z.object({
  score: z.number(),
  heading: z.string().nullable(),
  tag: z.string(),
  role: z.string().nullable(),
  selector: z.string().nullable(),
  matchedSignals: z.array(z.string()),
  text: z.string().max(12_000),
});

export const compactBrowserCaptureSchema = z.object({
  schemaVersion: z.literal(2),
  purpose: z.string(),
  page: z.object({
    url: z.string().url(),
    title: z.string().max(500),
    hostname: z.string(),
    pathname: z.string(),
  }),
  selectedJobCandidate: compactCandidateSchema.nullable(),
  alternativeCandidates: z
    .array(
      z.object({
        rank: z.number(),
        score: z.number(),
        heading: z.string().nullable(),
        tag: z.string(),
        role: z.string().nullable(),
        selector: z.string().nullable(),
        matchedSignals: z.array(z.string()),
        text: z.string().max(2_000),
      }),
    )
    .max(4),
  headings: z
    .array(
      z.object({
        level: z.number().int().min(1).max(6),
        text: z.string().max(1_000),
        selector: z.string(),
        attributes: z.record(z.string(), z.string()),
      }),
    )
    .max(80),
  jobPostingStructuredData: z.array(z.unknown()).max(3),
  pageSignals: z.object({
    bodyTextLength: z.number().int().nonnegative(),
    candidateCount: z.number().int().nonnegative(),
    structuredDataBlockCount: z.number().int().nonnegative(),
  }),
  stats: z.object({
    gptInputCharacters: z.number().int().nonnegative(),
    selectedCandidateCharacters: z.number().int().nonnegative(),
  }),
});

export type CompactBrowserCapture = z.infer<typeof compactBrowserCaptureSchema>;

export const compareCompactBrowserPageSchema = z.object({
  capture: compactBrowserCaptureSchema,
  cvVersionId: z.string().min(1),
});

export const analyzeCompactBrowserPageSchema = compactBrowserCaptureSchema;
