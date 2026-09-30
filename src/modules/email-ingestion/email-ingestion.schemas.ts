import { z } from 'zod';

const webhookJobSchema = z.object({
  title: z.string().trim().min(2).max(250),
  company: z.string().trim().max(250).optional(),
  location: z.string().trim().max(250).optional(),
  description: z.string().trim().max(100_000).optional(),
  salary: z.string().trim().max(500).optional(),
  postedAt: z.string().trim().max(100).optional(),
  expiresAt: z.string().trim().max(100).optional(),
  startDate: z.string().trim().max(100).optional(),
  employmentType: z.string().trim().max(100).optional(),
  sourceUrl: z.string().url().optional(),
  applyUrl: z.string().url().optional(),
  externalId: z.string().trim().max(250).optional(),
});

export const receiveEmailSchema = z.object({
  userId: z.string().min(1),
  sourceId: z.string().min(1).optional(),
  messageId: z.string().trim().min(1).max(500),
  sender: z.string().trim().max(500).optional(),
  subject: z.string().trim().max(1000).optional(),
  receivedAt: z.coerce.date(),
  text: z.string().max(500_000).optional(),
  html: z.string().max(1_000_000).optional(),
  jobs: z.array(webhookJobSchema).max(100).default([]),
});

export const acknowledgeLabelSchema = z.object({
  label: z.enum(['RECENT', 'OLD', 'MIXED']),
});

export const listEmailIngestionsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
