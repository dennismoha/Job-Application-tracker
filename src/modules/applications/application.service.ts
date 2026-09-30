import {
  ApplicationEventType,
  ApplicationStage,
  JobVisibility,
  type Prisma,
} from '@prisma/client';

import { BadRequestError, ConflictError, NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import { careerIntelligenceService } from '../career-intelligence/career-intelligence.service.js';

const stageEvent: Record<ApplicationStage, ApplicationEventType> = {
  APPLIED: ApplicationEventType.APPLIED,
  SCREENING: ApplicationEventType.SCREENING,
  INTERVIEW_SCHEDULED: ApplicationEventType.INTERVIEW_SCHEDULED,
  INTERVIEWED: ApplicationEventType.INTERVIEW_ATTENDED,
  SECOND_INTERVIEW: ApplicationEventType.SECOND_INTERVIEW,
  FINAL_INTERVIEW: ApplicationEventType.FINAL_INTERVIEW,
  OFFER: ApplicationEventType.OFFER_RECEIVED,
  ACCEPTED: ApplicationEventType.OFFER_ACCEPTED,
  DECLINED: ApplicationEventType.OFFER_DECLINED,
  REJECTED: ApplicationEventType.REJECTED,
  WITHDRAWN: ApplicationEventType.WITHDRAWN,
  NO_RESPONSE: ApplicationEventType.NO_RESPONSE,
  CLOSED: ApplicationEventType.CLOSED,
};

const eventStage: Partial<Record<ApplicationEventType, ApplicationStage>> = {
  APPLIED: ApplicationStage.APPLIED,
  SCREENING: ApplicationStage.SCREENING,
  INTERVIEW_SCHEDULED: ApplicationStage.INTERVIEW_SCHEDULED,
  INTERVIEW_ATTENDED: ApplicationStage.INTERVIEWED,
  SECOND_INTERVIEW: ApplicationStage.SECOND_INTERVIEW,
  FINAL_INTERVIEW: ApplicationStage.FINAL_INTERVIEW,
  OFFER_RECEIVED: ApplicationStage.OFFER,
  OFFER_ACCEPTED: ApplicationStage.ACCEPTED,
  OFFER_DECLINED: ApplicationStage.DECLINED,
  REJECTED: ApplicationStage.REJECTED,
  WITHDRAWN: ApplicationStage.WITHDRAWN,
  NO_RESPONSE: ApplicationStage.NO_RESPONSE,
  CLOSED: ApplicationStage.CLOSED,
};

async function ownedApplication(userId: string, applicationId: string) {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    include: {
      job: { include: { company: true } },
      sourceListing: { include: { source: true } },
      foundSource: true,
      appliedSource: true,
      searchProfile: true,
      cvVersion: { include: { cv: { select: { id: true, name: true } } } },
      events: { orderBy: { occurredAt: 'asc' } },
      notes: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!application) throw new NotFoundError('Application not found.');
  return application;
}

export const applicationService = {
  async list(
    userId: string,
    input: { stage?: ApplicationStage; profileId?: string; q?: string; page: number; limit: number },
  ) {
    const where: Prisma.ApplicationWhereInput = {
      userId,
      ...(input.stage ? { stage: input.stage } : {}),
      ...(input.profileId ? { searchProfileId: input.profileId } : {}),
      ...(input.q
        ? {
            job: {
              OR: [
                { title: { contains: input.q, mode: 'insensitive' } },
                { company: { name: { contains: input.q, mode: 'insensitive' } } },
              ],
            },
          }
        : {}),
    };

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          job: { include: { company: true } },
          searchProfile: { select: { id: true, name: true } },
          sourceListing: { include: { source: { select: { id: true, name: true } } } },
          foundSource: { select: { id: true, name: true } },
          appliedSource: { select: { id: true, name: true } },
          cvVersion: { include: { cv: { select: { id: true, name: true } } } },
          events: { orderBy: { occurredAt: 'desc' }, take: 3 },
        },
        orderBy: { lastActivityAt: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      prisma.application.count({ where }),
    ]);

    return {
      applications,
      pagination: { page: input.page, limit: input.limit, total, pages: Math.max(1, Math.ceil(total / input.limit)) },
    };
  },

  get(userId: string, applicationId: string) {
    return ownedApplication(userId, applicationId);
  },

  async create(
    userId: string,
    input: {
      jobId: string;
      searchProfileId?: string;
      sourceListingId?: string;
      foundSourceId?: string;
      appliedSourceId?: string;
      cvVersionId?: string;
      appliedAt?: Date;
      whereAppliedUrl?: string;
      note?: string;
    },
  ) {
    const job = await prisma.job.findFirst({
      where: { id: input.jobId, OR: [{ visibility: JobVisibility.PUBLIC }, { createdByUserId: userId }] },
      include: { listings: { select: { id: true, sourceId: true } } },
    });
    if (!job) throw new NotFoundError('Job not found.');

    if (input.searchProfileId) {
      const profile = await prisma.searchProfile.findFirst({ where: { id: input.searchProfileId, userId } });
      if (!profile) throw new NotFoundError('Search profile not found.');
    }

    if (input.sourceListingId && !job.listings.some((listing) => listing.id === input.sourceListingId)) {
      throw new BadRequestError('The selected source listing does not belong to this job.');
    }

    const selectedListing = input.sourceListingId
      ? job.listings.find((listing) => listing.id === input.sourceListingId)
      : undefined;
    if (input.foundSourceId) {
      const foundSource = await prisma.source.findUnique({ where: { id: input.foundSourceId }, select: { id: true } });
      if (!foundSource) throw new NotFoundError('Discovery Job Source not found.');
    }
    if (input.appliedSourceId) {
      const appliedSource = await prisma.source.findUnique({ where: { id: input.appliedSourceId }, select: { id: true } });
      if (!appliedSource) throw new NotFoundError('Application source not found.');
    }
    const foundSourceId = input.foundSourceId ?? selectedListing?.sourceId;
    const appliedSourceId = input.appliedSourceId ?? selectedListing?.sourceId;

    if (input.cvVersionId) {
      const cvVersion = await prisma.cvVersion.findFirst({ where: { id: input.cvVersionId, cv: { userId } } });
      if (!cvVersion) throw new NotFoundError('CV version not found.');
    }

    const active = await prisma.application.findFirst({
      where: {
        userId,
        jobId: input.jobId,
        stage: { notIn: [ApplicationStage.CLOSED, ApplicationStage.REJECTED, ApplicationStage.WITHDRAWN, ApplicationStage.DECLINED] },
      },
    });
    if (active) throw new ConflictError('An active application already exists for this job.');

    const appliedAt = input.appliedAt ?? new Date();
    const application = await prisma.$transaction(async (tx) => {
      const created = await tx.application.create({
        data: {
          userId,
          jobId: input.jobId,
          ...(input.searchProfileId ? { searchProfileId: input.searchProfileId } : {}),
          ...(input.sourceListingId ? { sourceListingId: input.sourceListingId } : {}),
          ...(foundSourceId ? { foundSourceId } : {}),
          ...(appliedSourceId ? { appliedSourceId } : {}),
          ...(input.cvVersionId ? { cvVersionId: input.cvVersionId } : {}),
          appliedAt,
          lastActivityAt: appliedAt,
          ...(input.whereAppliedUrl ? { whereAppliedUrl: input.whereAppliedUrl } : {}),
        },
      });

      await tx.applicationEvent.create({
        data: {
          applicationId: created.id,
          type: ApplicationEventType.APPLIED,
          occurredAt: appliedAt,
          ...(input.note ? { note: input.note } : {}),
        },
      });

      return created;
    });

    await careerIntelligenceService.getPack(userId, application.id);
    return ownedApplication(userId, application.id);
  },

  async updateAttribution(
    userId: string,
    applicationId: string,
    input: { foundSourceId?: string | null; appliedSourceId?: string | null },
  ) {
    await ownedApplication(userId, applicationId);
    const ids = [input.foundSourceId, input.appliedSourceId].filter((value): value is string => Boolean(value));
    if (ids.length) {
      const count = await prisma.source.count({ where: { id: { in: [...new Set(ids)] } } });
      if (count !== new Set(ids).size) throw new NotFoundError('One or more Job Sources were not found.');
    }
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        ...(input.foundSourceId !== undefined ? { foundSourceId: input.foundSourceId } : {}),
        ...(input.appliedSourceId !== undefined ? { appliedSourceId: input.appliedSourceId } : {}),
      },
    });
    return ownedApplication(userId, applicationId);
  },

  async updateStage(
    userId: string,
    applicationId: string,
    input: { stage: ApplicationStage; occurredAt?: Date; note?: string },
  ) {
    await ownedApplication(userId, applicationId);
    const occurredAt = input.occurredAt ?? new Date();

    await prisma.$transaction([
      prisma.application.update({
        where: { id: applicationId },
        data: { stage: input.stage, lastActivityAt: occurredAt },
      }),
      prisma.applicationEvent.create({
        data: {
          applicationId,
          type: stageEvent[input.stage],
          occurredAt,
          ...(input.note ? { note: input.note } : {}),
        },
      }),
    ]);

    await careerIntelligenceService.evaluateFollowUp(userId, applicationId);
    return ownedApplication(userId, applicationId);
  },

  async addEvent(
    userId: string,
    applicationId: string,
    input: { type: ApplicationEventType; occurredAt?: Date; note?: string },
  ) {
    await ownedApplication(userId, applicationId);
    const occurredAt = input.occurredAt ?? new Date();
    const stage = eventStage[input.type];

    await prisma.$transaction([
      prisma.applicationEvent.create({
        data: {
          applicationId,
          type: input.type,
          occurredAt,
          ...(input.note ? { note: input.note } : {}),
        },
      }),
      prisma.application.update({
        where: { id: applicationId },
        data: { lastActivityAt: occurredAt, ...(stage ? { stage } : {}) },
      }),
    ]);

    await careerIntelligenceService.evaluateFollowUp(userId, applicationId);
    return ownedApplication(userId, applicationId);
  },

  async remove(userId: string, applicationId: string) {
    await ownedApplication(userId, applicationId);
    await prisma.application.delete({ where: { id: applicationId } });
    return { deleted: true };
  },

  async addNote(userId: string, applicationId: string, note: string) {
    const application = await ownedApplication(userId, applicationId);
    return prisma.jobNote.create({
      data: { userId, jobId: application.jobId, applicationId, note },
    });
  },
};
