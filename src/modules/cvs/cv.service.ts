import {
  AiTaskType,
  CvMatchStatus,
  CvSourceType,
  CvSuggestionStatus,
  CvTailoringStatus,
  JobVisibility,
  type Prisma,
} from '@prisma/client';

import { BadRequestError, NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import { aiClient } from '../ai/ai-client.js';
import { createSimpleDocx, createSimplePdf, extractTextFromCvUpload } from './cv-file.service.js';
import {
  compareRequirementToCv,
  extractRequirementsFromDescription,
  scoreRequirementMatches,
  structuredCvToText,
} from './cv.utils.js';

interface CreateCvInput {
  name: string;
  description?: string;
  isMaster: boolean;
  plainText?: string;
  structuredData?: unknown;
  profileId?: string;
  makeDefault: boolean;
}

interface UploadCvInput {
  name: string;
  description?: string;
  isMaster: boolean;
  fileName: string;
  mimeType?: string;
  contentBase64: string;
  profileId?: string;
  makeDefault: boolean;
}

interface AiTailoringSuggestions {
  suggestions: Array<{
    requirementText?: string;
    section?: string;
    beforeText?: string;
    afterText?: string | null;
    reason: string;
    requiresConfirmation?: boolean;
  }>;
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

async function ownedProfile(userId: string, profileId: string) {
  const profile = await prisma.searchProfile.findFirst({ where: { id: profileId, userId } });
  if (!profile) throw new NotFoundError('Search profile not found.');
  return profile;
}

async function ownedCv(userId: string, cvId: string) {
  const cv = await prisma.cv.findFirst({
    where: { id: cvId, userId },
    include: {
      versions: { orderBy: { versionNumber: 'desc' } },
      profileLinks: { include: { profile: { select: { id: true, name: true } } } },
    },
  });
  if (!cv) throw new NotFoundError('CV not found.');
  return cv;
}

async function ownedVersion(userId: string, versionId: string) {
  const version = await prisma.cvVersion.findFirst({
    where: { id: versionId, cv: { userId } },
    include: { cv: true },
  });
  if (!version) throw new NotFoundError('CV version not found.');
  return version;
}

async function visibleJob(userId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, OR: [{ visibility: JobVisibility.PUBLIC }, { createdByUserId: userId }] },
    include: { company: true, listings: { select: { rawDescription: true } } },
  });
  if (!job) throw new NotFoundError('Job not found.');
  return job;
}

async function linkProfile(userId: string, cvId: string, profileId?: string, makeDefault = false) {
  if (!profileId) return null;
  await ownedProfile(userId, profileId);
  if (makeDefault) {
    await prisma.cvProfileLink.updateMany({
      where: { profileId, cv: { userId } },
      data: { isDefault: false },
    });
  }
  return prisma.cvProfileLink.upsert({
    where: { cvId_profileId: { cvId, profileId } },
    create: { cvId, profileId, isDefault: makeDefault },
    update: { isDefault: makeDefault },
  });
}

async function requirementsForJob(userId: string, jobId: string, refresh = false) {
  const job = await visibleJob(userId, jobId);
  if (!refresh) {
    const existing = await prisma.jobRequirement.findMany({ where: { jobId }, orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] });
    if (existing.length) return existing;
  }

  const description = job.description ?? job.listings.find((listing) => listing.rawDescription)?.rawDescription ?? '';
  if (!description.trim()) throw new BadRequestError('This job does not have enough description text to extract requirements.');

  let extracted = extractRequirementsFromDescription(description);
  if (aiClient.configured()) {
    try {
      const result = await aiClient.generateJson<{ requirements: Array<{ kind: 'REQUIRED' | 'PREFERRED' | 'SKILL' | 'OTHER'; text: string; priority?: number }> }>({
        task: AiTaskType.CV_REQUIREMENT_EXTRACTION,
        userId,
        jobId,
        system: [
          'Extract factual job requirements from the supplied vacancy.',
          'Return JSON only as {"requirements":[{"kind":"REQUIRED|PREFERRED|SKILL|OTHER","text":"...","priority":0-100}]}.',
          'Do not invent requirements. Keep separate qualifications, skills and experience expectations as separate items.',
        ].join(' '),
        payload: { title: job.title, company: job.company?.name, description },
      });
      if (result.requirements?.length) {
        extracted = result.requirements.slice(0, 28).map((item) => ({
          kind: item.kind,
          text: item.text.trim(),
          normalizedKey: item.text.toLowerCase().replace(/[^a-z0-9+#. ]+/g, ' ').replace(/\s+/g, ' ').trim(),
          priority: Math.max(1, Math.min(100, Math.round(item.priority ?? (item.kind === 'REQUIRED' ? 100 : 60)))),
        })) as typeof extracted;
      }
    } catch {
      // Deterministic extraction remains the fallback when AI is unavailable or returns an invalid response.
    }
  }

  if (!extracted.length) throw new BadRequestError('No clear job requirements could be extracted from this vacancy.');
  await prisma.jobRequirement.deleteMany({ where: { jobId } });
  await prisma.jobRequirement.createMany({
    data: extracted.map((item) => ({
      jobId,
      kind: item.kind,
      text: item.text,
      normalizedKey: item.normalizedKey,
      priority: item.priority,
    })),
  });
  return prisma.jobRequirement.findMany({ where: { jobId }, orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] });
}

async function compare(userId: string, jobId: string, cvVersionId: string, refreshRequirements = false) {
  const [job, version, requirements] = await Promise.all([
    visibleJob(userId, jobId),
    ownedVersion(userId, cvVersionId),
    requirementsForJob(userId, jobId, refreshRequirements),
  ]);

  const matched = requirements.map((requirement) => ({
    requirement,
    result: compareRequirementToCv(version.plainText, requirement.text),
  }));
  const aggregate = scoreRequirementMatches(matched.map((item) => ({ status: item.result.status, priority: item.requirement.priority })));
  const summary = `${aggregate.evidenced} requirements evidenced, ${aggregate.partial} partially evidenced, ${aggregate.notEvidenced} not evidenced and ${aggregate.needsConfirmation} needing confirmation.`;

  const saved = await prisma.$transaction(async (tx) => {
    const match = await tx.jobCvMatch.upsert({
      where: { userId_jobId_cvVersionId: { userId, jobId, cvVersionId } },
      create: {
        userId,
        jobId,
        cvVersionId,
        score: aggregate.score,
        summary,
        evidencedCount: aggregate.evidenced,
        partialCount: aggregate.partial,
        notEvidencedCount: aggregate.notEvidenced,
        needsConfirmationCount: aggregate.needsConfirmation,
      },
      update: {
        score: aggregate.score,
        summary,
        evidencedCount: aggregate.evidenced,
        partialCount: aggregate.partial,
        notEvidencedCount: aggregate.notEvidenced,
        needsConfirmationCount: aggregate.needsConfirmation,
      },
    });
    await tx.jobCvMatchItem.deleteMany({ where: { matchId: match.id } });
    await tx.jobCvMatchItem.createMany({
      data: matched.map((item) => ({
        matchId: match.id,
        requirementId: item.requirement.id,
        requirementText: item.requirement.text,
        status: item.result.status,
        ...(item.result.evidence ? { evidence: item.result.evidence } : {}),
        ...(item.result.suggestion ? { suggestion: item.result.suggestion } : {}),
      })),
    });
    return match;
  });

  return prisma.jobCvMatch.findUniqueOrThrow({
    where: { id: saved.id },
    include: {
      cvVersion: { include: { cv: { select: { id: true, name: true } } } },
      job: { include: { company: true } },
      items: { orderBy: { createdAt: 'asc' } },
    },
  });
}

function fallbackSuggestions(items: Array<{ requirementText: string; status: CvMatchStatus; evidence?: string | null; suggestion?: string | null }>) {
  return items
    .filter((item) => item.status !== CvMatchStatus.EVIDENCED && item.status !== CvMatchStatus.NOT_APPLICABLE)
    .map((item) => ({
      requirementText: item.requirementText,
      beforeText: item.evidence ?? undefined,
      reason: item.suggestion ?? 'Review how clearly this requirement is evidenced in the CV.',
      requiresConfirmation: item.status === CvMatchStatus.NOT_EVIDENCED || item.status === CvMatchStatus.NEEDS_CONFIRMATION,
      afterText: null as string | null,
    }));
}

async function suggestionsForMatch(userId: string, match: Awaited<ReturnType<typeof compare>>, baseText: string) {
  const fallback = fallbackSuggestions(match.items);
  if (!aiClient.configured()) return fallback;
  try {
    const result = await aiClient.generateJson<AiTailoringSuggestions>({
      task: AiTaskType.CV_TAILORING,
      userId,
      jobId: match.jobId,
      system: [
        'Suggest truthful CV improvements for the supplied job.',
        'Never invent degrees, employers, dates, certifications, skills, responsibilities or achievements.',
        'If a requirement is not evidenced, set requiresConfirmation=true and afterText=null.',
        'For partially evidenced requirements, rewrite only information already present in the CV.',
        'Return JSON only as {"suggestions":[{"requirementText":"...","section":"...","beforeText":"...","afterText":"... or null","reason":"...","requiresConfirmation":true|false}]}.',
      ].join(' '),
      payload: {
        job: { title: match.job.title, company: match.job.company?.name },
        cvText: baseText,
        gaps: match.items.map((item) => ({ requirementText: item.requirementText, status: item.status, evidence: item.evidence })),
      },
    });
    return result.suggestions?.length ? result.suggestions.slice(0, 24) : fallback;
  } catch {
    return fallback;
  }
}

export const cvService = {
  async list(userId: string, profileId?: string) {
    const cvs = await prisma.cv.findMany({
      where: { userId, archived: false },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        profileLinks: { include: { profile: { select: { id: true, name: true } } } },
      },
      orderBy: [{ isMaster: 'desc' }, { updatedAt: 'desc' }],
    });
    if (!profileId) return cvs;
    return cvs.sort((a, b) => {
      const aDefault = a.profileLinks.some((link) => link.profileId === profileId && link.isDefault) ? 1 : 0;
      const bDefault = b.profileLinks.some((link) => link.profileId === profileId && link.isDefault) ? 1 : 0;
      return bDefault - aDefault;
    });
  },

  get(userId: string, cvId: string) {
    return ownedCv(userId, cvId);
  },

  getVersion(userId: string, versionId: string) {
    return ownedVersion(userId, versionId);
  },

  async create(userId: string, input: CreateCvInput) {
    const text = input.plainText?.trim() || structuredCvToText(input.structuredData);
    if (!text) throw new BadRequestError('Add CV content before saving.');
    const cv = await prisma.$transaction(async (tx) => {
      if (input.isMaster) await tx.cv.updateMany({ where: { userId, isMaster: true }, data: { isMaster: false } });
      const created = await tx.cv.create({
        data: {
          userId,
          name: input.name,
          ...(input.description ? { description: input.description } : {}),
          isMaster: input.isMaster,
        },
      });
      await tx.cvVersion.create({
        data: {
          cvId: created.id,
          versionNumber: 1,
          label: 'Original',
          sourceType: CvSourceType.BUILDER,
          plainText: text,
          ...(input.structuredData ? { structuredData: json(input.structuredData) } : {}),
        },
      });
      return created;
    });
    await linkProfile(userId, cv.id, input.profileId, input.makeDefault);
    return ownedCv(userId, cv.id);
  },

  async upload(userId: string, input: UploadCvInput) {
    const parsed = await extractTextFromCvUpload(input);
    const cv = await prisma.$transaction(async (tx) => {
      if (input.isMaster) await tx.cv.updateMany({ where: { userId, isMaster: true }, data: { isMaster: false } });
      const created = await tx.cv.create({
        data: {
          userId,
          name: input.name,
          ...(input.description ? { description: input.description } : {}),
          isMaster: input.isMaster,
        },
      });
      await tx.cvVersion.create({
        data: {
          cvId: created.id,
          versionNumber: 1,
          label: 'Uploaded original',
          sourceType: CvSourceType.UPLOADED,
          originalFileName: input.fileName,
          mimeType: parsed.mimeType,
          originalFileData: parsed.buffer,
          plainText: parsed.text,
        },
      });
      return created;
    });
    await linkProfile(userId, cv.id, input.profileId, input.makeDefault);
    return ownedCv(userId, cv.id);
  },

  async update(userId: string, cvId: string, input: { name?: string; description?: string | null; isMaster?: boolean; archived?: boolean }) {
    await ownedCv(userId, cvId);
    if (input.isMaster) await prisma.cv.updateMany({ where: { userId, isMaster: true, id: { not: cvId } }, data: { isMaster: false } });
    await prisma.cv.update({ where: { id: cvId }, data: input });
    return ownedCv(userId, cvId);
  },

  async linkProfile(userId: string, cvId: string, profileId: string, isDefault: boolean) {
    await ownedCv(userId, cvId);
    await linkProfile(userId, cvId, profileId, isDefault);
    return ownedCv(userId, cvId);
  },

  async compare(userId: string, jobId: string, cvVersionId: string, refreshRequirements = false) {
    return compare(userId, jobId, cvVersionId, refreshRequirements);
  },

  async matchesForJob(userId: string, jobId: string) {
    await visibleJob(userId, jobId);
    return prisma.jobCvMatch.findMany({
      where: { userId, jobId },
      include: {
        cvVersion: { include: { cv: { select: { id: true, name: true } } } },
        items: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  },

  async createTailoringSession(userId: string, input: { jobId: string; cvVersionId: string; matchId?: string }) {
    const base = await ownedVersion(userId, input.cvVersionId);
    const match = input.matchId
      ? await prisma.jobCvMatch.findFirst({
          where: { id: input.matchId, userId, jobId: input.jobId, cvVersionId: input.cvVersionId },
          include: { items: true, job: { include: { company: true } }, cvVersion: true },
        })
      : await compare(userId, input.jobId, input.cvVersionId, false);
    if (!match) throw new NotFoundError('CV comparison not found.');

    const suggestions = await suggestionsForMatch(userId, match as Awaited<ReturnType<typeof compare>>, base.plainText);
    const session = await prisma.cvTailoringSession.create({
      data: {
        userId,
        jobId: input.jobId,
        baseCvVersionId: input.cvVersionId,
        matchId: match.id,
        workingText: base.plainText,
        ...(base.structuredData ? { workingData: base.structuredData } : {}),
        suggestions: {
          create: suggestions.map((item) => ({
            ...(item.requirementText ? { requirementText: item.requirementText } : {}),
            ...(item.section ? { section: item.section } : {}),
            ...(item.beforeText ? { beforeText: item.beforeText } : {}),
            ...(item.afterText ? { afterText: item.afterText } : {}),
            reason: item.reason,
            requiresConfirmation: Boolean(item.requiresConfirmation),
          })),
        },
      },
    });
    return this.getTailoringSession(userId, session.id);
  },

  async getTailoringSession(userId: string, sessionId: string) {
    const session = await prisma.cvTailoringSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        job: { include: { company: true } },
        baseCvVersion: { include: { cv: true } },
        createdVersion: { include: { cv: true } },
        match: { include: { items: true } },
        suggestions: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) throw new NotFoundError('CV tailoring session not found.');
    return session;
  },

  async updateTailoringSession(userId: string, sessionId: string, workingText: string) {
    await this.getTailoringSession(userId, sessionId);
    await prisma.cvTailoringSession.update({ where: { id: sessionId }, data: { workingText, status: CvTailoringStatus.DRAFT } });
    return this.getTailoringSession(userId, sessionId);
  },

  async updateSuggestion(
    userId: string,
    suggestionId: string,
    input: { status: CvSuggestionStatus; afterText?: string | null; confirmedFact?: string | null },
  ) {
    const suggestion = await prisma.cvTailoringSuggestion.findFirst({
      where: { id: suggestionId, session: { userId } },
      include: { session: true },
    });
    if (!suggestion) throw new NotFoundError('CV suggestion not found.');
    if (suggestion.requiresConfirmation && [CvSuggestionStatus.ACCEPTED, CvSuggestionStatus.EDITED].includes(input.status) && !input.confirmedFact?.trim()) {
      throw new BadRequestError('Confirm the factual experience before adding this missing requirement to the CV.');
    }
    const afterText = input.afterText?.trim() || (input.confirmedFact?.trim() ? `• ${input.confirmedFact.trim()}` : undefined);
    return prisma.cvTailoringSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: input.status,
        ...(input.afterText !== undefined ? { afterText: input.afterText } : afterText ? { afterText } : {}),
        ...(input.confirmedFact !== undefined ? { confirmedFact: input.confirmedFact } : {}),
      },
    });
  },

  async saveTailoredVersion(userId: string, sessionId: string, label?: string) {
    const session = await this.getTailoringSession(userId, sessionId);
    if (session.createdVersion) return session.createdVersion;
    const highest = await prisma.cvVersion.aggregate({ where: { cvId: session.baseCvVersion.cvId }, _max: { versionNumber: true } });
    const versionNumber = (highest._max.versionNumber ?? 0) + 1;
    const version = await prisma.$transaction(async (tx) => {
      const created = await tx.cvVersion.create({
        data: {
          cvId: session.baseCvVersion.cvId,
          versionNumber,
          label: label?.trim() || `Tailored for ${session.job.title}${session.job.company?.name ? ` · ${session.job.company.name}` : ''}`,
          sourceType: CvSourceType.TAILORED,
          plainText: session.workingText,
          ...(session.workingData ? { structuredData: session.workingData } : {}),
          changeSummary: `Tailored for ${session.job.title}${session.job.company?.name ? ` at ${session.job.company.name}` : ''}.`,
        },
      });
      await tx.cvTailoringSession.update({
        where: { id: sessionId },
        data: { status: CvTailoringStatus.SAVED, createdVersionId: created.id },
      });
      return created;
    });
    return version;
  },

  async downloadSourceTemplate(userId: string, versionId: string) {
    const version = await ownedVersion(userId, versionId);
    const source = await prisma.cvVersion.findFirst({
      where: { cvId: version.cvId, originalFileData: { not: null } },
      orderBy: { versionNumber: 'asc' },
    });
    if (!source?.originalFileData || !source.originalFileName) {
      throw new NotFoundError('This CV was created in the builder and does not have an uploaded source document.');
    }
    return {
      buffer: Buffer.from(source.originalFileData),
      contentType: source.mimeType ?? 'application/octet-stream',
      fileName: source.originalFileName,
    };
  },

  async download(userId: string, versionId: string, format: 'pdf' | 'docx') {
    const version = await ownedVersion(userId, versionId);
    const safeName = version.cv.name.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '') || 'cv';
    if (format === 'docx') {
      return {
        buffer: createSimpleDocx(version.plainText),
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: `${safeName}-v${version.versionNumber}.docx`,
      };
    }
    return {
      buffer: createSimplePdf(version.plainText),
      contentType: 'application/pdf',
      fileName: `${safeName}-v${version.versionNumber}.pdf`,
    };
  },
};
