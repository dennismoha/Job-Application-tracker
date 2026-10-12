import { CvSuggestionStatus } from '@prisma/client';
import { z } from 'zod';

const profileLinkFields = {
  profileId: z.string().min(1).optional(),
  makeDefault: z.boolean().default(false),
};

export const createCvSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  isMaster: z.boolean().default(false),
  plainText: z.string().trim().max(200_000).optional(),
  structuredData: z.unknown().optional(),
  ...profileLinkFields,
}).transform((value) => ({
  name: value.name,
  isMaster: value.isMaster,
  makeDefault: value.makeDefault,
  ...(value.description !== undefined ? { description: value.description } : {}),
  ...(value.plainText !== undefined ? { plainText: value.plainText } : {}),
  ...(value.structuredData !== undefined ? { structuredData: value.structuredData } : {}),
  ...(value.profileId !== undefined ? { profileId: value.profileId } : {}),
})).refine((value) => Boolean(value.plainText?.trim()) || Boolean(value.structuredData), {
  message: 'Add CV content before saving.',
});

export const uploadCvSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  isMaster: z.boolean().default(false),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().max(200).optional(),
  contentBase64: z.string().min(20).max(12_000_000),
  ...profileLinkFields,
}).transform((value) => ({
  name: value.name,
  isMaster: value.isMaster,
  fileName: value.fileName,
  contentBase64: value.contentBase64,
  makeDefault: value.makeDefault,
  ...(value.description !== undefined ? { description: value.description } : {}),
  ...(value.mimeType !== undefined ? { mimeType: value.mimeType } : {}),
  ...(value.profileId !== undefined ? { profileId: value.profileId } : {}),
}));

export const updateCvSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isMaster: z.boolean().optional(),
  archived: z.boolean().optional(),
}).transform((value) => ({
  ...(value.name !== undefined ? { name: value.name } : {}),
  ...(value.description !== undefined ? { description: value.description } : {}),
  ...(value.isMaster !== undefined ? { isMaster: value.isMaster } : {}),
  ...(value.archived !== undefined ? { archived: value.archived } : {}),
}));

export const linkCvProfileSchema = z.object({
  profileId: z.string().min(1),
  isDefault: z.boolean().default(false),
});

export const compareCvSchema = z.object({
  cvVersionId: z.string().min(1),
  refreshRequirements: z.boolean().default(false),
});

export const createTailoringSessionSchema = z.object({
  jobId: z.string().min(1),
  cvVersionId: z.string().min(1),
  matchId: z.string().min(1).optional(),
}).transform((value) => ({
  jobId: value.jobId,
  cvVersionId: value.cvVersionId,
  ...(value.matchId !== undefined ? { matchId: value.matchId } : {}),
}));

export const updateTailoringSessionSchema = z.object({
  workingText: z.string().max(250_000),
});

export const updateTailoringSuggestionSchema = z.object({
  status: z.nativeEnum(CvSuggestionStatus),
  afterText: z.string().trim().max(5_000).nullable().optional(),
  confirmedFact: z.string().trim().max(5_000).nullable().optional(),
}).transform((value) => ({
  status: value.status,
  ...(value.afterText !== undefined ? { afterText: value.afterText } : {}),
  ...(value.confirmedFact !== undefined ? { confirmedFact: value.confirmedFact } : {}),
}));

export const saveTailoredCvSchema = z.object({
  label: z.string().trim().max(160).optional(),
});

export const downloadCvSchema = z.object({
  format: z.enum(['pdf', 'docx']).default('pdf'),
});
