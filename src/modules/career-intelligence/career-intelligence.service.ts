import {
  AiTaskType,
  ApplicationPackStatus,
  ApplicationStage,
  CoverLetterStatus,
  FollowUpActionType,
  FollowUpState,
  JobStatus,
  OfferStatus,
  PriorityBucket,
  SearchCampaignStatus,
  SmartNotificationState,
  SmartNotificationType,
  type EvidenceType,
  Prisma,
} from '@prisma/client';

import { BadRequestError, NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import { aiClient } from '../ai/ai-client.js';

const INTERVIEW_STAGES: ApplicationStage[] = [
  ApplicationStage.INTERVIEW_SCHEDULED,
  ApplicationStage.INTERVIEWED,
  ApplicationStage.SECOND_INTERVIEW,
  ApplicationStage.FINAL_INTERVIEW,
];
const RESPONSE_STAGES: ApplicationStage[] = [
  ApplicationStage.SCREENING,
  ...INTERVIEW_STAGES,
  ApplicationStage.OFFER,
  ApplicationStage.ACCEPTED,
  ApplicationStage.DECLINED,
  ApplicationStage.REJECTED,
];
const OFFER_STAGES: ApplicationStage[] = [ApplicationStage.OFFER, ApplicationStage.ACCEPTED, ApplicationStage.DECLINED];

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86_400_000));
}

function jobSnapshot(job: {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  city: string | null;
  country: string | null;
  locationText: string | null;
  remoteType: string;
  employmentType: string;
  salaryMin: Prisma.Decimal | null;
  salaryMax: Prisma.Decimal | null;
  salaryCurrency: string | null;
  salaryPeriod: string;
  salaryText: string | null;
  officialApplyUrl: string | null;
  earliestPostedAt: Date | null;
  latestPostedAt: Date | null;
  expiresAt: Date | null;
  company: { name: string } | null;
  primaryCategory: { name: string } | null;
}) {
  return {
    jobId: job.id,
    title: job.title,
    company: job.company?.name ?? null,
    category: job.primaryCategory?.name ?? null,
    summary: job.summary,
    description: job.description,
    location: { city: job.city, country: job.country, text: job.locationText },
    remoteType: job.remoteType,
    employmentType: job.employmentType,
    salary: {
      min: job.salaryMin?.toString() ?? null,
      max: job.salaryMax?.toString() ?? null,
      currency: job.salaryCurrency,
      period: job.salaryPeriod,
      text: job.salaryText,
    },
    officialApplyUrl: job.officialApplyUrl,
    earliestPostedAt: job.earliestPostedAt?.toISOString() ?? null,
    latestPostedAt: job.latestPostedAt?.toISOString() ?? null,
    expiresAt: job.expiresAt?.toISOString() ?? null,
  };
}

async function ownedApplication(userId: string, applicationId: string) {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    include: {
      job: {
        include: {
          company: true,
          primaryCategory: true,
          listings: { include: { source: true }, orderBy: { firstSeenAt: 'asc' } },
          profileMatches: true,
        },
      },
      searchProfile: true,
      sourceListing: { include: { source: true } },
      appliedSource: true,
      pack: { include: { snapshots: { orderBy: { capturedAt: 'desc' } } } },
      events: { orderBy: { occurredAt: 'asc' } },
      interviewWorkspace: true,
      contacts: { include: { contact: true } },
      offer: true,
      coverLetters: { orderBy: { updatedAt: 'desc' } },
      followUps: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!application) throw new NotFoundError('Application not found.');
  return application;
}

async function ownedProfile(userId: string, profileId: string) {
  const profile = await prisma.searchProfile.findFirst({ where: { id: profileId, userId } });
  if (!profile) throw new NotFoundError('Search profile not found.');
  return profile;
}

async function createSnapshotForPack(userId: string, applicationId: string, reason = 'APPLICATION_PACK_CREATED') {
  const application = await ownedApplication(userId, applicationId);
  const pack = application.pack ?? await prisma.applicationPack.create({
    data: {
      userId,
      applicationId,
      status: ApplicationPackStatus.DRAFT,
      cvVersionId: application.cvVersionId,
      sourceUrl: application.whereAppliedUrl ?? application.job.officialApplyUrl,
    },
  });
  const preferredListing = application.sourceListing ?? application.job.listings.find((listing) => listing.isOfficial) ?? application.job.listings[0];
  return prisma.jobSnapshot.create({
    data: {
      jobId: application.jobId,
      applicationPackId: pack.id,
      reason,
      sourceUrl: preferredListing?.sourceUrl ?? preferredListing?.applyUrl ?? application.job.officialApplyUrl,
      contentHash: preferredListing?.contentHash,
      snapshot: jsonValue(jobSnapshot(application.job)),
    },
  });
}

async function ensurePack(userId: string, applicationId: string) {
  const application = await ownedApplication(userId, applicationId);
  if (!application.pack) await createSnapshotForPack(userId, applicationId);
  return ownedApplication(userId, applicationId);
}

function followUpFor(application: Awaited<ReturnType<typeof ownedApplication>>) {
  const now = new Date();
  const idleDays = daysBetween(application.lastActivityAt, now);
  if (application.stage === ApplicationStage.OFFER) {
    return { action: FollowUpActionType.DECIDE_OFFER, dueAt: now, reason: 'An offer is awaiting a decision or negotiation.' };
  }
  if (application.stage === ApplicationStage.INTERVIEW_SCHEDULED || application.stage === ApplicationStage.SECOND_INTERVIEW || application.stage === ApplicationStage.FINAL_INTERVIEW) {
    const futureEvent = application.events.find((event) => event.occurredAt > now && event.type.includes('INTERVIEW'));
    return { action: FollowUpActionType.PREPARE_INTERVIEW, dueAt: futureEvent?.occurredAt ?? now, reason: 'An interview is scheduled; prepare evidence and questions.' };
  }
  if (application.stage === ApplicationStage.INTERVIEWED && idleDays <= 2) {
    return { action: FollowUpActionType.THANK_YOU, dueAt: now, reason: 'A short post-interview thank-you or follow-up may be appropriate.' };
  }
  if ([ApplicationStage.APPLIED, ApplicationStage.SCREENING].includes(application.stage) && idleDays >= 7) {
    return { action: FollowUpActionType.FOLLOW_UP, dueAt: now, reason: `There has been no recorded application activity for ${idleDays} days.` };
  }
  return { action: FollowUpActionType.WAIT, dueAt: new Date(application.lastActivityAt.getTime() + 7 * 86_400_000), reason: 'No action is required yet based on the recorded application timeline.' };
}

function priorityBucket(score: number): PriorityBucket {
  if (score >= 80) return PriorityBucket.HIGH_ATTENTION;
  if (score >= 60) return PriorityBucket.REVIEW;
  if (score >= 40) return PriorityBucket.LATER;
  return PriorityBucket.LOW_PRIORITY;
}

export const careerIntelligenceService = {
  async listEvidence(userId: string, type?: EvidenceType) {
    return prisma.evidenceEntry.findMany({ where: { userId, ...(type ? { type } : {}) }, orderBy: [{ verified: 'desc' }, { updatedAt: 'desc' }] });
  },

  createEvidence(userId: string, input: Omit<Prisma.EvidenceEntryUncheckedCreateInput, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return prisma.evidenceEntry.create({ data: { ...input, userId, metrics: input.metrics ? jsonValue(input.metrics) : undefined } });
  },

  async updateEvidence(userId: string, evidenceId: string, input: Prisma.EvidenceEntryUpdateInput) {
    const current = await prisma.evidenceEntry.findFirst({ where: { id: evidenceId, userId } });
    if (!current) throw new NotFoundError('Evidence entry not found.');
    return prisma.evidenceEntry.update({ where: { id: evidenceId }, data: input });
  },

  async deleteEvidence(userId: string, evidenceId: string) {
    const current = await prisma.evidenceEntry.findFirst({ where: { id: evidenceId, userId } });
    if (!current) throw new NotFoundError('Evidence entry not found.');
    await prisma.evidenceEntry.delete({ where: { id: evidenceId } });
    return { deleted: true };
  },

  async getPack(userId: string, applicationId: string) {
    const application = await ensurePack(userId, applicationId);
    return {
      application,
      pack: application.pack,
      coverLetters: application.coverLetters,
      interview: application.interviewWorkspace,
      contacts: application.contacts,
      followUps: application.followUps,
      offer: application.offer,
    };
  },

  async updatePack(userId: string, applicationId: string, input: { status?: ApplicationPackStatus; cvVersionId?: string | null; sourceUrl?: string | null; answers?: Record<string, unknown> | null; notes?: string | null }) {
    const application = await ensurePack(userId, applicationId);
    const pack = application.pack!;
    const updated = await prisma.applicationPack.update({
      where: { id: pack.id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.cvVersionId !== undefined ? { cvVersionId: input.cvVersionId } : {}),
        ...(input.sourceUrl !== undefined ? { sourceUrl: input.sourceUrl } : {}),
        ...(input.answers !== undefined ? { answers: input.answers ? jsonValue(input.answers) : Prisma.JsonNull } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });
    if (input.cvVersionId !== undefined) {
      await prisma.application.update({ where: { id: application.id }, data: { cvVersionId: input.cvVersionId } });
    }
    return updated;
  },

  async captureSnapshot(userId: string, applicationId: string, reason = 'MANUAL_CAPTURE') {
    await ensurePack(userId, applicationId);
    return createSnapshotForPack(userId, applicationId, reason);
  },

  async jobHistory(userId: string, jobId: string) {
    const job = await prisma.job.findFirst({
      where: { id: jobId, OR: [{ visibility: 'PUBLIC' }, { createdByUserId: userId }] },
      include: {
        snapshots: { orderBy: { capturedAt: 'desc' } },
        listings: { include: { source: true, revisions: { orderBy: { detectedAt: 'desc' } } }, orderBy: { firstSeenAt: 'asc' } },
        statusEvents: { orderBy: { occurredAt: 'desc' } },
      },
    });
    if (!job) throw new NotFoundError('Job not found.');
    return job;
  },

  async generateCoverLetter(userId: string, applicationId: string, input: { profileId?: string; evidenceEntryIds?: string[]; tone: 'professional' | 'concise' | 'warm' }) {
    const application = await ensurePack(userId, applicationId);
    const evidence = await prisma.evidenceEntry.findMany({
      where: { userId, verified: true, ...(input.evidenceEntryIds?.length ? { id: { in: input.evidenceEntryIds } } : {}) },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });
    const profileId = input.profileId ?? application.searchProfileId ?? undefined;
    if (profileId) await ownedProfile(userId, profileId);
    const profileMatch = profileId ? application.job.profileMatches.find((match) => match.profileId === profileId) : undefined;
    const evidencePayload = evidence.map((item) => ({ id: item.id, type: item.type, title: item.title, summary: item.summary, details: item.details, skills: item.skills, metrics: item.metrics }));
    const requirements = [...(profileMatch?.matchedKeywords ?? []), ...(profileMatch?.missingKeywords ?? [])];

    let content: string;
    let covered: Array<{ requirement: string; evidenceIds: string[] }>;
    if (aiClient.configured()) {
      const generated = await aiClient.generateJson<{ content: string; requirementsCovered: Array<{ requirement: string; evidenceIds: string[] }> }>({
        task: AiTaskType.COVER_LETTER,
        userId,
        profileId,
        jobId: application.jobId,
        system: 'Write a truthful cover letter using ONLY the supplied verified evidence. Never invent experience, qualifications, metrics, employers, dates, skills, or achievements. If evidence is missing, omit the claim. Return JSON with content and requirementsCovered.',
        payload: { tone: input.tone, job: jobSnapshot(application.job), requirements, verifiedEvidence: evidencePayload },
      });
      content = generated.content;
      covered = generated.requirementsCovered;
    } else {
      const company = application.job.company?.name ?? 'the hiring team';
      const selected = evidence.slice(0, 4);
      content = `Dear ${company},\n\nI am applying for the ${application.job.title} role. ${selected.map((item) => item.summary).join(' ')}\n\nI would welcome the opportunity to discuss how this verified experience relates to the role.\n\nSincerely`;
      covered = requirements.map((requirement) => ({ requirement, evidenceIds: selected.filter((item) => `${item.title} ${item.summary} ${item.skills.join(' ')}`.toLowerCase().includes(requirement.toLowerCase())).map((item) => item.id) })).filter((item) => item.evidenceIds.length > 0);
    }

    return prisma.coverLetter.create({
      data: {
        userId,
        applicationId,
        jobId: application.jobId,
        profileId,
        title: `${application.job.title} cover letter`,
        content,
        status: CoverLetterStatus.DRAFT,
        requirementsCovered: jsonValue(covered),
        evidenceEntryIds: evidence.map((item) => item.id),
      },
    });
  },

  async updateCoverLetter(userId: string, coverLetterId: string, input: { title?: string; content?: string; status?: CoverLetterStatus }) {
    const item = await prisma.coverLetter.findFirst({ where: { id: coverLetterId, userId } });
    if (!item) throw new NotFoundError('Cover letter not found.');
    return prisma.coverLetter.update({ where: { id: coverLetterId }, data: input });
  },

  async getInterview(userId: string, applicationId: string) {
    const application = await ownedApplication(userId, applicationId);
    return application.interviewWorkspace ?? prisma.interviewWorkspace.create({ data: { applicationId } });
  },

  async updateInterview(userId: string, applicationId: string, input: Record<string, unknown>) {
    await ownedApplication(userId, applicationId);
    const existing = await prisma.interviewWorkspace.findUnique({ where: { applicationId } });
    const data = {
      ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt as Date | null } : {}),
      ...(input.meetingUrl !== undefined ? { meetingUrl: input.meetingUrl as string | null } : {}),
      ...(input.location !== undefined ? { location: input.location as string | null } : {}),
      ...(input.likelyAreas !== undefined ? { likelyAreas: input.likelyAreas ? jsonValue(input.likelyAreas) : Prisma.JsonNull } : {}),
      ...(input.starExamples !== undefined ? { starExamples: input.starExamples ? jsonValue(input.starExamples) : Prisma.JsonNull } : {}),
      ...(input.questionsToAsk !== undefined ? { questionsToAsk: input.questionsToAsk ? jsonValue(input.questionsToAsk) : Prisma.JsonNull } : {}),
      ...(input.prepNotes !== undefined ? { prepNotes: input.prepNotes as string | null } : {}),
      ...(input.questionsAsked !== undefined ? { questionsAsked: input.questionsAsked ? jsonValue(input.questionsAsked) : Prisma.JsonNull } : {}),
      ...(input.outcomeNotes !== undefined ? { outcomeNotes: input.outcomeNotes as string | null } : {}),
      ...(input.followUpNotes !== undefined ? { followUpNotes: input.followUpNotes as string | null } : {}),
    } satisfies Prisma.InterviewWorkspaceUpdateInput;
    return existing
      ? prisma.interviewWorkspace.update({ where: { applicationId }, data })
      : prisma.interviewWorkspace.create({ data: { applicationId, ...data } });
  },

  async generateInterviewPrep(userId: string, applicationId: string) {
    const application = await ownedApplication(userId, applicationId);
    const evidence = await prisma.evidenceEntry.findMany({ where: { userId, verified: true }, orderBy: { updatedAt: 'desc' }, take: 30 });
    const match = application.searchProfileId ? application.job.profileMatches.find((item) => item.profileId === application.searchProfileId) : undefined;
    const likelyAreas = [...new Set([...(match?.matchedKeywords ?? []), ...(match?.missingKeywords ?? [])])].slice(0, 12);
    const starExamples = evidence.filter((item) => ['ACHIEVEMENT', 'PROJECT', 'RESPONSIBILITY', 'TEACHING_ACHIEVEMENT'].includes(item.type)).slice(0, 8).map((item) => ({ evidenceId: item.id, title: item.title, prompt: `Use this verified evidence when a question relates to ${item.skills.join(', ') || item.title}.`, evidence: item.summary }));
    const questionsToAsk = [
      'What would success in this role look like in the first six months?',
      'What are the most important priorities for the person joining this role?',
      'How does the team measure performance and development?',
    ];
    return careerIntelligenceService.updateInterview(userId, applicationId, { likelyAreas, starExamples, questionsToAsk });
  },

  listContacts(userId: string) {
    return prisma.contact.findMany({ where: { userId }, include: { applications: { include: { application: { include: { job: { include: { company: true } } } } } } }, orderBy: { updatedAt: 'desc' } });
  },

  createContact(userId: string, input: Prisma.ContactUncheckedCreateInput) {
    return prisma.contact.create({ data: { ...input, userId } });
  },

  async updateContact(userId: string, contactId: string, input: Prisma.ContactUpdateInput) {
    const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
    if (!contact) throw new NotFoundError('Contact not found.');
    return prisma.contact.update({ where: { id: contactId }, data: input });
  },

  async deleteContact(userId: string, contactId: string) {
    const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
    if (!contact) throw new NotFoundError('Contact not found.');
    await prisma.contact.delete({ where: { id: contactId } });
    return { deleted: true };
  },

  async linkContact(userId: string, applicationId: string, contactId: string, relationship?: string) {
    await ownedApplication(userId, applicationId);
    const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
    if (!contact) throw new NotFoundError('Contact not found.');
    return prisma.applicationContact.upsert({
      where: { applicationId_contactId: { applicationId, contactId } },
      update: { relationship },
      create: { applicationId, contactId, relationship },
    });
  },

  async evaluateFollowUp(userId: string, applicationId: string) {
    const application = await ownedApplication(userId, applicationId);
    const suggestion = followUpFor(application);
    await prisma.followUpSuggestion.updateMany({ where: { userId, applicationId, state: FollowUpState.SUGGESTED }, data: { state: FollowUpState.DISMISSED } });
    return prisma.followUpSuggestion.create({ data: { userId, applicationId, ...suggestion } });
  },

  listFollowUps(userId: string, state?: FollowUpState) {
    return prisma.followUpSuggestion.findMany({ where: { userId, ...(state ? { state } : {}) }, include: { application: { include: { job: { include: { company: true } } } } }, orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }] });
  },

  async updateFollowUp(userId: string, followUpId: string, state: FollowUpState) {
    const item = await prisma.followUpSuggestion.findFirst({ where: { id: followUpId, userId } });
    if (!item) throw new NotFoundError('Follow-up suggestion not found.');
    return prisma.followUpSuggestion.update({ where: { id: followUpId }, data: { state } });
  },

  async upsertOffer(userId: string, applicationId: string, input: Record<string, unknown>) {
    const application = await ownedApplication(userId, applicationId);
    const data = input as Prisma.OfferUncheckedCreateInput;
    const offer = await prisma.offer.upsert({
      where: { applicationId },
      create: { ...data, userId, applicationId },
      update: data,
    });
    if (application.stage !== ApplicationStage.OFFER && application.stage !== ApplicationStage.ACCEPTED && application.stage !== ApplicationStage.DECLINED) {
      await prisma.application.update({ where: { id: applicationId }, data: { stage: ApplicationStage.OFFER, lastActivityAt: new Date() } });
    }
    return offer;
  },

  async compareOffers(userId: string) {
    return prisma.offer.findMany({ where: { userId, status: { in: [OfferStatus.RECEIVED, OfferStatus.NEGOTIATING] } }, include: { application: { include: { job: { include: { company: true } } } } }, orderBy: { updatedAt: 'desc' } });
  },

  async skillGaps(userId: string, profileId: string | undefined, days: number) {
    if (profileId) await ownedProfile(userId, profileId);
    const matches = await prisma.jobProfileMatch.findMany({
      where: { ...(profileId ? { profileId } : { profile: { userId } }), matchedAt: { gte: daysAgo(days) } },
      include: { job: { select: { id: true, title: true } } },
    });
    const denominator = Math.max(1, matches.length);
    const missing = new Map<string, number>();
    const matched = new Map<string, number>();
    for (const match of matches) {
      for (const keyword of new Set((match.missingKeywords as string[]).map((item) => item.trim()).filter(Boolean))) missing.set(keyword, (missing.get(keyword) ?? 0) + 1);
      for (const keyword of new Set((match.matchedKeywords as string[]).map((item) => item.trim()).filter(Boolean))) matched.set(keyword, (matched.get(keyword) ?? 0) + 1);
    }
    const evidence = await prisma.evidenceEntry.findMany({ where: { userId, verified: true }, select: { title: true, summary: true, skills: true } });
    const evidenceText = evidence.map((item) => `${item.title} ${item.summary} ${item.skills.join(' ')}`).join(' ').toLowerCase();
    const rows = [...new Set([...missing.keys(), ...matched.keys()])].map((keyword) => ({
      keyword,
      jobs: Math.max(missing.get(keyword) ?? 0, matched.get(keyword) ?? 0),
      frequency: Math.max(missing.get(keyword) ?? 0, matched.get(keyword) ?? 0) / denominator,
      missingCount: missing.get(keyword) ?? 0,
      matchedCount: matched.get(keyword) ?? 0,
      evidenced: evidenceText.includes(keyword.toLowerCase()),
    })).sort((a, b) => b.frequency - a.frequency || b.missingCount - a.missingCount);
    return { profileId: profileId ?? null, days, jobsAnalyzed: matches.length, gaps: rows.slice(0, 100) };
  },

  async market(userId: string, profileId: string | undefined, days: number) {
    if (profileId) await ownedProfile(userId, profileId);
    const since = daysAgo(days);
    const jobs = await prisma.job.findMany({
      where: {
        firstSeenAt: { gte: since },
        ...(profileId ? { profileMatches: { some: { profileId } } } : { OR: [{ visibility: 'PUBLIC' }, { createdByUserId: userId }] }),
      },
      include: { company: true, primaryCategory: true, listings: { include: { source: true } } },
    });
    const countBy = <T extends string>(values: T[]) => Object.entries(values.reduce<Record<string, number>>((acc, value) => { acc[value] = (acc[value] ?? 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);
    const companies = countBy(jobs.map((job) => job.company?.name ?? 'Unknown')).slice(0, 20);
    const categories = countBy(jobs.map((job) => job.primaryCategory?.name ?? 'Uncategorized')).slice(0, 20);
    const months = countBy(jobs.map((job) => job.firstSeenAt.toISOString().slice(0, 7)));
    const sources = countBy(jobs.flatMap((job) => job.listings.map((listing) => listing.source.name))).slice(0, 20);
    const salaries = jobs.filter((job) => job.salaryMin || job.salaryMax).map((job) => ({ min: job.salaryMin?.toNumber() ?? null, max: job.salaryMax?.toNumber() ?? null, currency: job.salaryCurrency }));
    return { profileId: profileId ?? null, days, totalJobs: jobs.length, topCompanies: companies, categories, months, sources, salaries };
  },

  async strategy(userId: string, profileId: string | undefined, days: number) {
    if (profileId) await ownedProfile(userId, profileId);
    const applications = await prisma.application.findMany({
      where: { userId, appliedAt: { gte: daysAgo(days) }, ...(profileId ? { searchProfileId: profileId } : {}) },
      include: { appliedSource: true, sourceListing: { include: { source: true } } },
    });
    const summarize = (items: typeof applications) => ({
      applications: items.length,
      responses: items.filter((item) => RESPONSE_STAGES.includes(item.stage)).length,
      interviews: items.filter((item) => INTERVIEW_STAGES.includes(item.stage) || OFFER_STAGES.includes(item.stage)).length,
      offers: items.filter((item) => OFFER_STAGES.includes(item.stage)).length,
    });
    const byKey = <T>(keyFn: (item: typeof applications[number]) => string, labelFn: (key: string) => T) => {
      const groups = new Map<string, typeof applications>();
      for (const app of applications) { const key = keyFn(app); groups.set(key, [...(groups.get(key) ?? []), app]); }
      return [...groups.entries()].map(([key, items]) => ({ key, label: labelFn(key), ...summarize(items) })).sort((a, b) => b.applications - a.applications);
    };
    return {
      days,
      overall: summarize(applications),
      byCvVersion: byKey((item) => item.cvVersionId ?? 'unrecorded', (key) => key === 'unrecorded' ? 'CV not recorded' : `CV ${key}`),
      bySource: byKey((item) => item.appliedSourceId ?? item.sourceListing?.sourceId ?? 'unknown', (key) => applications.find((item) => item.appliedSourceId === key)?.appliedSource?.name ?? applications.find((item) => item.sourceListing?.sourceId === key)?.sourceListing?.source.name ?? 'Unknown source'),
    };
  },

  async priorities(userId: string, profileId?: string) {
    if (profileId) await ownedProfile(userId, profileId);
    const now = new Date();
    const jobs = await prisma.job.findMany({
      where: {
        status: { in: [JobStatus.ACTIVE, JobStatus.UNKNOWN] },
        ...(profileId ? { profileMatches: { some: { profileId } } } : { userStates: { some: { userId } } }),
      },
      include: {
        company: true,
        userStates: { where: { userId }, take: 1 },
        profileMatches: profileId ? { where: { profileId }, take: 1 } : true,
        applications: { where: { userId }, take: 1 },
      },
      take: 500,
    });
    await prisma.jobPriority.deleteMany({ where: { userId, ...(profileId ? { profileId } : { profileId: null }) } });
    const rows = jobs.filter((job) => job.applications.length === 0).map((job) => {
      const match = job.profileMatches[0];
      let score = match?.score ?? 45;
      const reasons: string[] = [];
      if (match?.score != null) reasons.push(`${Math.round(match.score)}% search-profile fit`);
      const daysToClose = job.expiresAt ? Math.ceil((job.expiresAt.getTime() - now.getTime()) / 86_400_000) : null;
      if (daysToClose !== null && daysToClose >= 0 && daysToClose <= 3) { score += 15; reasons.push(`Closes in ${daysToClose} day${daysToClose === 1 ? '' : 's'}`); }
      if (job.userStates[0]?.disposition === 'SAVED') { score += 5; reasons.push('Saved to shortlist'); }
      if (['ORANGE', 'RED'].includes(job.systemRiskLevel)) { score -= 30; reasons.push(`${job.systemRiskLevel.toLowerCase()} trust/risk level`); }
      const age = job.earliestPostedAt ? daysBetween(job.earliestPostedAt, now) : daysBetween(job.firstSeenAt, now);
      if (age > 30) { score -= 15; reasons.push(`Vacancy appears ${age} days old`); }
      score = Math.max(0, Math.min(100, score));
      return { userId, jobId: job.id, profileId: profileId ?? null, bucket: priorityBucket(score), score, reasons: jsonValue(reasons), title: job.title, company: job.company?.name ?? null, expiresAt: job.expiresAt };
    }).sort((a, b) => b.score - a.score);
    if (rows.length) await prisma.jobPriority.createMany({ data: rows.map(({ title, company, expiresAt, ...row }) => row) });
    return rows;
  },

  async listCampaigns(userId: string) {
    const campaigns = await prisma.searchCampaign.findMany({ where: { userId }, include: { profile: true }, orderBy: { startedAt: 'desc' } });
    return Promise.all(campaigns.map(async (campaign) => ({ campaign, summary: await careerIntelligenceService.campaignSummary(userId, campaign.id) })));
  },

  async createCampaign(userId: string, input: { profileId?: string; name: string; startedAt?: Date; notes?: string }) {
    if (input.profileId) await ownedProfile(userId, input.profileId);
    return prisma.searchCampaign.create({ data: { userId, ...input } });
  },

  async updateCampaign(userId: string, campaignId: string, input: { name?: string; status?: SearchCampaignStatus; endedAt?: Date | null; notes?: string | null }) {
    const current = await prisma.searchCampaign.findFirst({ where: { id: campaignId, userId } });
    if (!current) throw new NotFoundError('Search campaign not found.');
    return prisma.searchCampaign.update({ where: { id: campaignId }, data: input });
  },

  async campaignSummary(userId: string, campaignId: string) {
    const campaign = await prisma.searchCampaign.findFirst({ where: { id: campaignId, userId } });
    if (!campaign) throw new NotFoundError('Search campaign not found.');
    const to = campaign.endedAt ?? new Date();
    const applicationWhere: Prisma.ApplicationWhereInput = { userId, appliedAt: { gte: campaign.startedAt, lte: to }, ...(campaign.profileId ? { searchProfileId: campaign.profileId } : {}) };
    const applications = await prisma.application.findMany({ where: applicationWhere });
    const jobsDiscovered = campaign.profileId
      ? await prisma.jobProfileMatch.count({ where: { profileId: campaign.profileId, matchedAt: { gte: campaign.startedAt, lte: to } } })
      : await prisma.job.count({ where: { firstSeenAt: { gte: campaign.startedAt, lte: to } } });
    const shortlisted = campaign.profileId
      ? await prisma.userJobState.count({ where: { userId, disposition: 'SAVED', job: { profileMatches: { some: { profileId: campaign.profileId, matchedAt: { gte: campaign.startedAt, lte: to } } } } } })
      : await prisma.userJobState.count({ where: { userId, disposition: 'SAVED', savedAt: { gte: campaign.startedAt, lte: to } } });
    return {
      jobsDiscovered,
      shortlisted,
      applications: applications.length,
      responses: applications.filter((item) => RESPONSE_STAGES.includes(item.stage)).length,
      interviews: applications.filter((item) => INTERVIEW_STAGES.includes(item.stage) || OFFER_STAGES.includes(item.stage)).length,
      offers: applications.filter((item) => OFFER_STAGES.includes(item.stage)).length,
    };
  },

  async refreshNotifications(userId: string) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 36 * 60 * 60 * 1000);
    const candidates: Array<{ type: SmartNotificationType; title: string; message: string; targetType?: string; targetId?: string; actionUrl?: string; fingerprint: string }> = [];

    const closing = await prisma.userJobState.findMany({ where: { userId, disposition: 'SAVED', job: { expiresAt: { gte: now, lte: tomorrow } } }, include: { job: { include: { company: true } } } });
    for (const item of closing) candidates.push({ type: SmartNotificationType.CLOSING_SOON, title: 'Saved job closes soon', message: `${item.job.title}${item.job.company?.name ? ` at ${item.job.company.name}` : ''} closes soon.`, targetType: 'job', targetId: item.jobId, actionUrl: '#/opportunities', fingerprint: `closing:${item.jobId}:${item.job.expiresAt?.toISOString().slice(0,10)}` });

    const due = await prisma.followUpSuggestion.findMany({ where: { userId, state: FollowUpState.SUGGESTED, dueAt: { lte: now } }, include: { application: { include: { job: { include: { company: true } } } } } });
    for (const item of due) candidates.push({ type: SmartNotificationType.FOLLOW_UP_DUE, title: 'Application needs attention', message: `${item.application.job.title}: ${item.reason}`, targetType: 'application', targetId: item.applicationId, actionUrl: '#/applications', fingerprint: `followup:${item.id}` });

    const strong = await prisma.jobProfileMatch.findMany({ where: { profile: { userId }, score: { gte: 80 }, matchedAt: { gte: daysAgo(1) } }, include: { job: { include: { company: true } } }, take: 100 });
    for (const item of strong) candidates.push({ type: SmartNotificationType.STRONG_MATCH, title: 'Strong-match job discovered', message: `${item.job.title}${item.job.company?.name ? ` at ${item.job.company.name}` : ''} matched at ${Math.round(item.score ?? 0)}%.`, targetType: 'job', targetId: item.jobId, actionUrl: '#/opportunities', fingerprint: `strong:${item.id}` });

    const changed = await prisma.jobListingRevision.findMany({ where: { detectedAt: { gte: daysAgo(1) }, listing: { job: { userStates: { some: { userId, disposition: 'SAVED' } } } } }, include: { listing: { include: { job: true } } }, take: 100 });
    for (const item of changed) candidates.push({ type: SmartNotificationType.JOB_CHANGED, title: 'Saved job changed', message: `${item.listing.job.title} was updated by the employer/source.`, targetType: 'job', targetId: item.listing.jobId, actionUrl: '#/opportunities', fingerprint: `change:${item.id}` });

    const recovered = await prisma.sourceHealth.findMany({ where: { status: 'HEALTHY', lastFailureAt: { gte: daysAgo(7) }, lastSuccessAt: { gte: daysAgo(1) }, source: { subscriptions: { some: { profile: { userId }, enabled: true } } } }, include: { source: true } });
    for (const item of recovered) candidates.push({ type: SmartNotificationType.SOURCE_RECOVERED, title: 'Source recovered', message: `${item.source.name} is healthy again after a recent failure.`, targetType: 'source', targetId: item.sourceId, actionUrl: '#/sources', fingerprint: `recovered:${item.sourceId}:${item.lastSuccessAt?.toISOString().slice(0,10)}` });

    const interviews = await prisma.interviewWorkspace.findMany({ where: { scheduledAt: { gte: now, lte: tomorrow }, application: { userId } }, include: { application: { include: { job: { include: { company: true } } } } } });
    for (const item of interviews) candidates.push({ type: SmartNotificationType.INTERVIEW_UPCOMING, title: 'Interview coming up', message: `${item.application.job.title}${item.application.job.company?.name ? ` at ${item.application.job.company.name}` : ''} has an interview scheduled ${item.scheduledAt?.toLocaleString() ?? 'soon'}.`, targetType: 'application', targetId: item.applicationId, actionUrl: '#/applications', fingerprint: `interview:${item.id}:${item.scheduledAt?.toISOString()}` });

    const offers = await prisma.offer.findMany({ where: { userId, status: { in: [OfferStatus.RECEIVED, OfferStatus.NEGOTIATING] } }, include: { application: { include: { job: { include: { company: true } } } } } });
    for (const item of offers) candidates.push({ type: SmartNotificationType.OFFER_ACTION, title: 'Offer needs attention', message: `${item.application.job.title}${item.application.job.company?.name ? ` at ${item.application.job.company.name}` : ''} has an active offer record.`, targetType: 'application', targetId: item.applicationId, actionUrl: '#/applications', fingerprint: `offer:${item.id}:${item.updatedAt.toISOString().slice(0,10)}` });

    for (const item of candidates) {
      await prisma.smartNotification.upsert({
        where: { userId_fingerprint: { userId, fingerprint: item.fingerprint } },
        update: { title: item.title, message: item.message },
        create: { userId, ...item },
      });
    }
    return careerIntelligenceService.listNotifications(userId);
  },

  listNotifications(userId: string) {
    return prisma.smartNotification.findMany({ where: { userId, state: { not: SmartNotificationState.DISMISSED } }, orderBy: { createdAt: 'desc' }, take: 200 });
  },

  async updateNotification(userId: string, notificationId: string, state: SmartNotificationState) {
    const item = await prisma.smartNotification.findFirst({ where: { id: notificationId, userId } });
    if (!item) throw new NotFoundError('Notification not found.');
    return prisma.smartNotification.update({ where: { id: notificationId }, data: { state, readAt: state === SmartNotificationState.READ ? new Date() : item.readAt } });
  },

  async assistantField(userId: string, applicationId: string, fieldLabel: string, fieldHelp?: string) {
    const application = await ensurePack(userId, applicationId);
    const evidence = await prisma.evidenceEntry.findMany({ where: { userId, verified: true }, orderBy: { updatedAt: 'desc' }, take: 30 });
    const label = `${fieldLabel} ${fieldHelp ?? ''}`.toLowerCase();
    if (/salary|compensation|expected pay/.test(label)) return { requiresUserInput: true, draft: null, reason: 'Salary expectation is a personal decision and is not inferred from CV evidence.' };
    if (/notice period|available to start|availability/.test(label)) return { requiresUserInput: true, draft: null, reason: 'Current availability is time-sensitive and must be confirmed by you.' };
    if (/current location|address/.test(label)) return { requiresUserInput: true, draft: null, reason: 'Current location is not inferred from a search profile.' };
    const evidencePayload = evidence.map((item) => ({ title: item.title, summary: item.summary, skills: item.skills, details: item.details }));
    if (aiClient.configured()) {
      return aiClient.generateJson<{ requiresUserInput: boolean; draft: string | null; reason: string; evidenceUsed: string[] }>({
        task: AiTaskType.APPLICATION_ASSISTANT,
        userId,
        profileId: application.searchProfileId ?? undefined,
        jobId: application.jobId,
        system: 'Draft an application-form answer using ONLY verified evidence provided. Do not invent facts. If the question cannot be answered from evidence, set requiresUserInput true and draft null. Return JSON.',
        payload: { fieldLabel, fieldHelp, job: jobSnapshot(application.job), verifiedEvidence: evidencePayload },
      });
    }
    const relevant = evidence.filter((item) => `${item.title} ${item.summary} ${item.skills.join(' ')}`.toLowerCase().split(/\s+/).some((token) => token.length > 4 && label.includes(token))).slice(0, 4);
    if (!relevant.length) return { requiresUserInput: true, draft: null, reason: 'No verified evidence clearly answers this field.' };
    return { requiresUserInput: false, draft: relevant.map((item) => item.summary).join(' '), reason: 'Drafted from verified Evidence Bank entries.', evidenceUsed: relevant.map((item) => item.id) };
  },

  async launchApplication(userId: string, applicationId: string) {
    const application = await ensurePack(userId, applicationId);
    const applyUrl = application.whereAppliedUrl ?? application.job.officialApplyUrl ?? application.sourceListing?.applyUrl ?? application.sourceListing?.sourceUrl;
    if (!applyUrl) throw new BadRequestError('This application does not have a usable external application URL.');
    const cvVersionId = application.pack?.cvVersionId ?? application.cvVersionId ?? null;
    return {
      applyUrl,
      cvVersionId,
      cvDownloadPath: cvVersionId ? `/api/cvs/versions/${encodeURIComponent(cvVersionId)}/download?format=docx` : null,
      sequence: ['download_cv_if_available', 'open_application_url'],
      requiresUserGesture: true,
    };
  },
};
