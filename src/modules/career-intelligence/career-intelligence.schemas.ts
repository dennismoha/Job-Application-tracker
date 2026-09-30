import {
  ApplicationPackStatus,
  CoverLetterStatus,
  EvidenceType,
  FollowUpState,
  OfferStatus,
  SearchCampaignStatus,
  SmartNotificationState,
} from '@prisma/client';
import { z } from 'zod';

const stringArray = z.array(z.string().trim().min(1).max(120)).max(100).default([]);

export const evidenceCreateSchema = z.object({
  type: z.nativeEnum(EvidenceType),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(4_000),
  details: z.string().trim().max(20_000).optional(),
  organization: z.string().trim().max(200).optional(),
  role: z.string().trim().max(200).optional(),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional(),
  skills: stringArray,
  tags: stringArray,
  metrics: z.record(z.string(), z.unknown()).optional(),
  verified: z.boolean().default(true),
  sourceLabel: z.string().trim().max(300).optional(),
  sourceCvVersionId: z.string().trim().max(200).optional(),
});
export const evidenceUpdateSchema = evidenceCreateSchema.partial();

export const packUpdateSchema = z.object({
  status: z.nativeEnum(ApplicationPackStatus).optional(),
  cvVersionId: z.string().trim().max(200).nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  answers: z.record(z.string(), z.unknown()).nullable().optional(),
  notes: z.string().trim().max(30_000).nullable().optional(),
});

export const coverLetterGenerateSchema = z.object({
  profileId: z.string().min(1).optional(),
  evidenceEntryIds: z.array(z.string().min(1)).max(50).optional(),
  tone: z.enum(['professional', 'concise', 'warm']).default('professional'),
});
export const coverLetterUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().trim().min(1).max(30_000).optional(),
  status: z.nativeEnum(CoverLetterStatus).optional(),
});

export const interviewUpdateSchema = z.object({
  scheduledAt: z.coerce.date().nullable().optional(),
  meetingUrl: z.string().url().nullable().optional(),
  location: z.string().trim().max(500).nullable().optional(),
  likelyAreas: z.array(z.unknown()).nullable().optional(),
  starExamples: z.array(z.unknown()).nullable().optional(),
  questionsToAsk: z.array(z.unknown()).nullable().optional(),
  prepNotes: z.string().max(30_000).nullable().optional(),
  questionsAsked: z.array(z.unknown()).nullable().optional(),
  outcomeNotes: z.string().max(30_000).nullable().optional(),
  followUpNotes: z.string().max(30_000).nullable().optional(),
});

export const contactCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().trim().max(100).optional(),
  organization: z.string().trim().max(200).optional(),
  title: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(20_000).optional(),
  nextFollowUpAt: z.coerce.date().nullable().optional(),
});
export const contactUpdateSchema = contactCreateSchema.partial();
export const contactLinkSchema = z.object({ contactId: z.string().min(1), relationship: z.string().trim().max(200).optional() });

export const followUpStateSchema = z.object({ state: z.nativeEnum(FollowUpState) });

export const offerUpsertSchema = z.object({
  status: z.nativeEnum(OfferStatus).default(OfferStatus.RECEIVED),
  salary: z.coerce.number().nonnegative().nullable().optional(),
  currency: z.string().trim().max(10).nullable().optional(),
  bonusText: z.string().max(5_000).nullable().optional(),
  housingText: z.string().max(5_000).nullable().optional(),
  transportText: z.string().max(5_000).nullable().optional(),
  medicalText: z.string().max(5_000).nullable().optional(),
  visaText: z.string().max(5_000).nullable().optional(),
  schoolFeesText: z.string().max(5_000).nullable().optional(),
  leaveText: z.string().max(5_000).nullable().optional(),
  contractDurationText: z.string().max(5_000).nullable().optional(),
  remotePolicyText: z.string().max(5_000).nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  probationText: z.string().max(5_000).nullable().optional(),
  noticePeriodText: z.string().max(5_000).nullable().optional(),
  otherBenefits: z.string().max(10_000).nullable().optional(),
  notes: z.string().max(20_000).nullable().optional(),
});

export const intelligenceQuerySchema = z.object({
  profileId: z.string().min(1).optional(),
  days: z.coerce.number().int().min(7).max(730).default(90),
});

export const campaignCreateSchema = z.object({
  profileId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(200),
  startedAt: z.coerce.date().optional(),
  notes: z.string().max(20_000).optional(),
});
export const campaignUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  status: z.nativeEnum(SearchCampaignStatus).optional(),
  endedAt: z.coerce.date().nullable().optional(),
  notes: z.string().max(20_000).nullable().optional(),
});

export const assistantFieldSchema = z.object({
  applicationId: z.string().min(1),
  fieldLabel: z.string().trim().min(1).max(500),
  fieldHelp: z.string().trim().max(2_000).optional(),
});

export const notificationStateSchema = z.object({ state: z.nativeEnum(SmartNotificationState) });
