import {
  AcquisitionMethod,
  CollectionCapability,
  EmailFreshness,
  ExtractionMethod,
  JobVisibility,
  SourceHealthStatus,
  SourceType,
  type Prisma,
} from '@prisma/client';

import { ConflictError, NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import type { RawJobListing } from '../acquisition/collectors/collector.types.js';
import { jobIngestionService } from '../ingestion/ingestion.service.js';

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

async function genericEmailSource() {
  const source = await prisma.source.upsert({
    where: { slug: 'email-alerts' },
    create: {
      name: 'Email Alerts',
      slug: 'email-alerts',
      sourceType: SourceType.NEWSLETTER,
      collectionCapability: CollectionCapability.EMAIL_ONLY,
      baseUrl: 'https://email-alerts.invalid/',
      emailAlertsAvailable: true,
      active: true,
    },
    update: {},
  });

  await prisma.sourceHealth.upsert({
    where: { sourceId: source.id },
    create: { sourceId: source.id, status: SourceHealthStatus.UNKNOWN },
    update: {},
  });

  return source;
}

function ageInDays(postedAt: string | undefined, receivedAt: Date): number | null {
  if (!postedAt) return null;
  const parsed = new Date(postedAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.max(0, (receivedAt.getTime() - parsed.getTime()) / 86_400_000);
}

function classifyFreshness(jobs: Array<{ postedAt?: string }>, receivedAt: Date): EmailFreshness {
  const ages = jobs.flatMap((job) => {
    const age = ageInDays(job.postedAt, receivedAt);
    return age === null ? [] : [age];
  });

  if (ages.length === 0) return EmailFreshness.UNKNOWN;
  const recent = ages.filter((age) => age <= 7).length;
  const old = ages.filter((age) => age > 14).length;
  if (recent === ages.length) return EmailFreshness.RECENT;
  if (old === ages.length) return EmailFreshness.OLD;
  return EmailFreshness.MIXED;
}

export const emailIngestionService = {
  async receive(input: {
    userId: string;
    sourceId?: string;
    messageId: string;
    sender?: string;
    subject?: string;
    receivedAt: Date;
    text?: string;
    html?: string;
    jobs: Array<{
      title: string;
      company?: string;
      location?: string;
      description?: string;
      salary?: string;
      postedAt?: string;
      expiresAt?: string;
      startDate?: string;
      employmentType?: string;
      sourceUrl?: string;
      applyUrl?: string;
      externalId?: string;
    }>;
  }) {
    const existing = await prisma.emailIngestion.findUnique({ where: { messageId: input.messageId } });
    if (existing) throw new ConflictError('This email message has already been processed.');

    const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true } });
    if (!user) throw new NotFoundError('Email ingestion user not found.');

    const source = input.sourceId
      ? await prisma.source.findUnique({ where: { id: input.sourceId } })
      : await genericEmailSource();
    if (!source) throw new NotFoundError('Email source not found.');

    const freshness = classifyFreshness(input.jobs, input.receivedAt);
    const email = await prisma.emailIngestion.create({
      data: {
        userId: input.userId,
        sourceId: source.id,
        messageId: input.messageId,
        ...(input.sender ? { sender: input.sender } : {}),
        ...(input.subject ? { subject: input.subject } : {}),
        receivedAt: input.receivedAt,
        freshness,
        jobCount: input.jobs.length,
        rawMetadata: jsonValue({
          text: input.text?.slice(0, 100_000),
          html: input.html?.slice(0, 200_000),
        }),
      },
    });

    const rawListings: RawJobListing[] = input.jobs.map((job) => ({
      sourceId: source.id,
      acquisitionMethod: AcquisitionMethod.EMAIL,
      ...(job.externalId ? { externalId: job.externalId } : {}),
      ...(job.sourceUrl ? { sourceUrl: job.sourceUrl } : {}),
      ...(job.applyUrl ? { applyUrl: job.applyUrl } : {}),
      title: job.title,
      ...(job.company ? { company: job.company } : {}),
      ...(job.location ? { location: job.location } : {}),
      ...(job.description ? { description: job.description } : {}),
      ...(job.salary ? { salary: job.salary } : {}),
      ...(job.postedAt ? { postedAt: job.postedAt } : {}),
      ...(job.expiresAt ? { expiresAt: job.expiresAt } : {}),
      ...(job.startDate ? { startDate: job.startDate } : {}),
      ...(job.employmentType ? { employmentType: job.employmentType } : {}),
      extractionMethod: ExtractionMethod.SOURCE_PARSER,
      discoveredAt: input.receivedAt,
      rawPayload: job,
    }));

    const ingestion = await jobIngestionService.processBatch(rawListings, {
      emailIngestionId: email.id,
      createdByUserId: input.userId,
      visibility: JobVisibility.PUBLIC,
    });

    const recommendedLabel =
      freshness === EmailFreshness.RECENT
        ? 'Jobs/Recent'
        : freshness === EmailFreshness.OLD
          ? 'Jobs/Old'
          : freshness === EmailFreshness.MIXED
            ? 'Jobs/Mixed'
            : 'Jobs/Review';

    return { email, ingestion, recommendedLabel };
  },

  async acknowledgeLabel(userId: string, emailId: string, label: 'RECENT' | 'OLD' | 'MIXED') {
    const email = await prisma.emailIngestion.findFirst({ where: { id: emailId, userId } });
    if (!email) throw new NotFoundError('Email ingestion not found.');

    return prisma.emailIngestion.update({
      where: { id: emailId },
      data: {
        recentFolderAssigned: label === 'RECENT' || label === 'MIXED',
        oldFolderAssigned: label === 'OLD' || label === 'MIXED',
        processedAt: new Date(),
      },
    });
  },

  list(userId: string, limit: number) {
    return prisma.emailIngestion.findMany({
      where: { userId },
      include: { source: { select: { id: true, name: true } } },
      orderBy: { receivedAt: 'desc' },
      take: limit,
    });
  },
};
