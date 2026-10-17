import {
  AcquisitionMethod,
  AiTaskType,
  EligibilityStatus,
  ExtractionMethod,
  JobVisibility,
  type Prisma,
} from '@prisma/client';

import { BadRequestError, NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import type { RawJobListing } from '../acquisition/collectors/collector.types.js';
import { jobIngestionService } from '../ingestion/ingestion.service.js';
import { aiClient } from './open-router-clients.js';

interface JobAnalysis {
  score: number;
  eligibility: 'ELIGIBLE' | 'POSSIBLY_ELIGIBLE' | 'INELIGIBLE' | 'UNKNOWN';
  summary: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  evidence: string[];
  concerns: string[];
}

interface ExtractedJobs {
  jobs: Array<{
    title: string;
    company?: string | null;
    location?: string | null;
    description?: string | null;
    salary?: string | null;
    postedAt?: string | null;
    expiresAt?: string | null;
    employmentType?: string | null;
    sourceUrl?: string | null;
    applyUrl?: string | null;
  }>;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export const aiService = {
  async analyzeJob(userId: string, jobId: string, profileId: string) {
    if (!aiClient.configured()) throw new BadRequestError('AI is not configured. Add AI_API_KEY first.');

    const [job, profile] = await Promise.all([
      prisma.job.findFirst({
        where: { id: jobId, OR: [{ visibility: JobVisibility.PUBLIC }, { createdByUserId: userId }] },
        include: { company: true, listings: { select: { rawDescription: true, rawLocation: true } } },
      }),
      prisma.searchProfile.findFirst({
        where: { id: profileId, userId },
        include: { categories: { select: { name: true, slug: true } } },
      }),
    ]);
    if (!job) throw new NotFoundError('Job not found.');
    if (!profile) throw new NotFoundError('Search profile not found.');

    const analysis = await aiClient.generateJson<JobAnalysis>({
      task: AiTaskType.PROFILE_MATCH,
      userId,
      profileId,
      jobId,
      system: [
        'Evaluate the supplied job against the user search profile.',
        'Return JSON only with score (0-100), eligibility, summary, matchedKeywords, missingKeywords, evidence and concerns.',
        'Use UNKNOWN when geographic or work-authorisation eligibility is not stated.',
        'Do not invent requirements or candidate qualifications.',
      ].join(' '),
      payload: {
        profile: {
          name: profile.name,
          description: profile.description,
          keywords: profile.keywords,
          excludedKeywords: profile.excludedKeywords,
          countries: profile.countries,
          locations: profile.locations,
          remoteOnly: profile.remoteOnly,
          categories: profile.categories,
        },
        job: {
          title: job.title,
          company: job.company?.name,
          location: job.locationText,
          country: job.country,
          description: job.description ?? job.listings.find((listing) => listing.rawDescription)?.rawDescription,
          employmentType: job.employmentType,
          remoteType: job.remoteType,
          salary: job.salaryText,
        },
      },
    });

    const score = clampScore(analysis.score);
    const eligibility = Object.values(EligibilityStatus).includes(analysis.eligibility as EligibilityStatus)
      ? (analysis.eligibility as EligibilityStatus)
      : EligibilityStatus.UNKNOWN;

    const match = await prisma.jobProfileMatch.upsert({
      where: { profileId_jobId: { profileId, jobId } },
      create: {
        profileId,
        jobId,
        score,
        eligibility,
        matchedKeywords: analysis.matchedKeywords ?? [],
        missingKeywords: analysis.missingKeywords ?? [],
        reason: analysis as unknown as Prisma.InputJsonValue,
      },
      update: {
        score,
        eligibility,
        matchedKeywords: analysis.matchedKeywords ?? [],
        missingKeywords: analysis.missingKeywords ?? [],
        reason: analysis as unknown as Prisma.InputJsonValue,
        matchedAt: new Date(),
      },
    });

    return { match, analysis: { ...analysis, score, eligibility } };
  },

  async extractEmail(userId: string, emailId: string) {
    if (!aiClient.configured()) throw new BadRequestError('AI is not configured. Add AI_API_KEY first.');
    const email = await prisma.emailIngestion.findFirst({
      where: { id: emailId, userId },
      include: { source: true },
    });
    if (!email) throw new NotFoundError('Email ingestion not found.');
    if (!email.source) throw new BadRequestError('Email ingestion has no source.');

    const payload = email.rawMetadata as { text?: string; html?: string } | null;
    const extracted = await aiClient.generateJson<ExtractedJobs>({
      task: AiTaskType.EXTRACTION,
      userId,
      system: [
        'Extract distinct job vacancies from this email.',
        'Return JSON only as {"jobs": [...]}.',
        'Each job may include title, company, location, description, salary, postedAt, expiresAt, employmentType, sourceUrl and applyUrl.',
        'Use null for missing values. Do not infer dates or eligibility that are not stated.',
      ].join(' '),
      payload: { subject: email.subject, sender: email.sender, text: payload?.text, html: payload?.html },
    });

    const raw: RawJobListing[] = (extracted.jobs ?? [])
      .filter((job) => Boolean(job.title?.trim()))
      .map((job) => ({
        sourceId: email.source!.id,
        title: job.title,
        ...(job.company ? { company: job.company } : {}),
        ...(job.location ? { location: job.location } : {}),
        ...(job.description ? { description: job.description } : {}),
        ...(job.salary ? { salary: job.salary } : {}),
        ...(job.postedAt ? { postedAt: job.postedAt } : {}),
        ...(job.expiresAt ? { expiresAt: job.expiresAt } : {}),
        ...(job.employmentType ? { employmentType: job.employmentType } : {}),
        ...(job.sourceUrl ? { sourceUrl: job.sourceUrl } : {}),
        ...(job.applyUrl ? { applyUrl: job.applyUrl } : {}),
        extractionMethod: ExtractionMethod.LLM,
        discoveredAt: email.receivedAt,
        rawPayload: job,
      }));

    const ingestion = await jobIngestionService.processBatch(raw, {
      emailIngestionId: email.id,
      createdByUserId: userId,
      visibility: JobVisibility.PUBLIC,
    });

    await prisma.emailIngestion.update({
      where: { id: email.id },
      data: { processedAt: new Date(), jobCount: raw.length },
    });

    return { jobsExtracted: raw.length, ingestion };
  },

  async reviewSource(userId: string, sourceId: string) {
    if (!aiClient.configured()) throw new BadRequestError('AI is not configured. Add AI_API_KEY first.');
    const source = await prisma.source.findFirst({
      where: {
        id: sourceId,
        OR: [{ createdByUserId: userId }, { subscriptions: { some: { profile: { userId } } } }],
      },
      include: { audits: { orderBy: { auditedAt: 'desc' }, take: 5 }, health: true },
    });
    if (!source) throw new NotFoundError('Source not found.');

    return aiClient.generateJson<{ recommendedCapability: string; confidence: string; reasons: string[] }>({
      task: AiTaskType.SOURCE_REVIEW,
      userId,
      system: 'Review the supplied objective source-audit evidence. Return JSON only with recommendedCapability, confidence and reasons. Do not recommend bypassing access controls.',
      payload: {
        source: {
          name: source.name,
          type: source.sourceType,
          currentMode: source.collectionCapability,
          requiresLogin: source.requiresLogin,
          antiBotObserved: source.antiBotObserved,
          emailAlertsAvailable: source.emailAlertsAvailable,
        },
        audits: source.audits,
        health: source.health,
      },
    });
  },
};
