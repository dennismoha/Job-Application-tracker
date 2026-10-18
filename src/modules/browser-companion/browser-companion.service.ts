import { createHash, randomBytes } from 'node:crypto';

import {
  AcquisitionMethod,
  AiTaskType,
  CvMatchStatus,
  ExtractionMethod,
  JobVisibility,
  UserJobDisposition,
  type Prisma,
} from '@prisma/client';
import { z } from 'zod';

import { BadRequestError, NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import { hashSessionToken } from '../../shared/security/session-token.js';
import { assertSavableUrl, normalizeJobUrl } from '../../shared/urls/url-integrity.js';
import { applicationService } from '../applications/application.service.js';
import { aiClient } from '../ai/open-router-clients.js';
import type { RawJobListing } from '../acquisition/collectors/collector.types.js';
import { jobIngestionService } from '../ingestion/ingestion.service.js';
import { cvService } from '../cvs/cv.service.js';
import { sourceService } from '../sources/source.service.js';
import { jobUrlService } from '../jobs/job-url.service.js';
import {
  cleanJobDescription,
  compareRequirementToCv,
  extractJobComparisonContent,
  extractRequirementsFromDescription,
  scoreRequirementMatches,
} from '../cvs/cv.utils.js';
import type { CompactBrowserCapture } from './browser-companion.schemas.js';

const aiStringSchema = z.preprocess((value) => (value == null ? '' : value), z.string());
const aiStringArraySchema = z.preprocess(
  (value) => (value == null ? [] : typeof value === 'string' ? [value] : value),
  z.array(z.string()),
);
const pageTypes = ['JOB_DETAIL', 'MULTIPLE_JOBS', 'JOB_SOURCE', 'UNKNOWN'] as const;
const aiPageTypeSchema = z.preprocess((value) => {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return (pageTypes as readonly string[]).includes(normalized) ? normalized : 'UNKNOWN';
}, z.enum(pageTypes));

const aiPageExtractionSchema = z.object({
  pageType: aiPageTypeSchema,
  title: aiStringSchema,
  company: aiStringSchema,
  location: aiStringSchema,
  remote: z.preprocess((value) => (value == null ? false : value), z.boolean()),
  workMode: aiStringSchema,
  employmentType: aiStringSchema,
  salaryMin: z.number().nullable().optional(),
  salaryMax: z.number().nullable().optional(),
  salaryCurrency: aiStringSchema,
  salaryPeriod: aiStringSchema,
  salaryRaw: aiStringSchema,
  postedDate: aiStringSchema,
  applicationMethod: aiStringSchema,
  responsibilities: aiStringArraySchema,
  qualifications: aiStringArraySchema,
  skills: aiStringArraySchema,
  education: aiStringArraySchema,
  benefits: aiStringArraySchema,
  description: aiStringSchema,
  extractionNotes: aiStringArraySchema,
});

const aiComparisonSchema = z.object({
  matchScore: z.number().optional(),
  verdict: z.string().optional(),
  summary: z.string().optional(),
  matchedRequirements: z.array(z.object({
    requirement: z.string(),
    evidence: aiStringSchema,
  })).optional(),
  missingRequirements: z.array(z.object({
    requirement: z.string(),
    importance: aiStringSchema,
    suggestion: aiStringSchema,
  })).optional(),
}).passthrough();

type AiPageExtraction = z.infer<typeof aiPageExtractionSchema>;
type CompactBrowserAnalysis = Awaited<ReturnType<typeof analyzeCompactCaptureWithN8nAi>>;
type BrowserPageComparisonResult = CompactBrowserAnalysis & {
  match: {
    cv: { id: string; name: string; versionId: string; versionNumber: number };
    score: number;
    verdict?: string;
    summary?: string;
    improvedCv?: unknown;
    evidencedCount: number;
    partialCount: number;
    notEvidencedCount: number;
    needsConfirmationCount: number;
    items: Array<{
      requirementText: string;
      kind: string;
      status: CvMatchStatus;
      evidence?: string;
      suggestion?: string;
    }>;
  } | null;
  comparisonOrigin: 'CACHE' | 'FRESH';
};

function section(label: string, items: string[]): string | undefined {
  const content = items.map((item) => cleanJobDescription(item)).filter(Boolean);
  return content.length ? `${label}\n${content.map((item) => `• ${item}`).join('\n')}` : undefined;
}

function browserAnalysisCacheKey(capture: CompactBrowserCapture): string {
  return createHash('sha256').update(JSON.stringify(capture)).digest('hex');
}

function browserComparisonCacheKey(userId: string, capture: CompactBrowserCapture, cvVersionId: string): string {
  return createHash('sha256')
    .update(JSON.stringify({ kind: 'cv-comparison', userId, capture, cvVersionId }))
    .digest('hex');
}

async function saveBrowserComparisonCache(cacheKey: string, pageUrl: string, result: Record<string, unknown>) {
  const jsonResult = JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue;
  await prisma.browserPageAnalysisCache.upsert({
    where: { cacheKey },
    create: { cacheKey, pageUrl, result: jsonResult },
    update: { pageUrl, result: jsonResult },
  });
}

function analysisFromAiExtraction(capture: CompactBrowserCapture, extraction: AiPageExtraction) {
  const extractedText = [
    extraction.description
      ? `Description\n${cleanJobDescription(extraction.description)}`
      : undefined,
    section('Responsibilities', extraction.responsibilities),
    section('Requirements', extraction.qualifications),
    section('Skills', extraction.skills),
    section('Education', extraction.education),
    section('Benefits', extraction.benefits),
  ]
    .filter(Boolean)
    .join('\n\n');
  const hasSufficientContent = extractedText.replace(/\s/g, '').length >= 80;
  const isJob =
    extraction.pageType === 'JOB_DETAIL' &&
    Boolean(extraction.title.trim()) &&
    hasSufficientContent;
  const description = [
    extraction.title.trim() ? `Job Title\n${extraction.title.trim()}` : undefined,
    extraction.company.trim() ? `Company\n${extraction.company.trim()}` : undefined,
    extraction.location.trim() ? `Location\n${extraction.location.trim()}` : undefined,
    extraction.employmentType.trim()
      ? `Employment Type\n${extraction.employmentType.trim()}`
      : undefined,
    extraction.workMode.trim() ? `Work Mode\n${extraction.workMode.trim()}` : undefined,
    extraction.salaryRaw.trim()
      ? `Compensation\n${extraction.salaryRaw.trim()}`
      : extraction.salaryMin != null || extraction.salaryMax != null
        ? `Compensation\n${[extraction.salaryCurrency, [extraction.salaryMin, extraction.salaryMax].filter((value) => value != null).join('–'), extraction.salaryPeriod].filter(Boolean).join(' ')}`
        : undefined,
    extractedText,
  ]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 100_000);

  return {
    pageType: extraction.pageType,
    confidence: isJob
      ? extractedText.length >= 400 && capture.selectedJobCandidate
        ? 'HIGH'
        : 'MEDIUM'
      : extraction.pageType === 'MULTIPLE_JOBS'
        ? 'MEDIUM'
        : 'LOW',
    isJob,
    extractionNotes: extraction.extractionNotes,
    jobPreview: isJob
      ? {
        summary: extraction.description.trim(),
        responsibilities: extraction.responsibilities,
        requirements: extraction.qualifications,
        skills: extraction.skills,
        education: extraction.education,
        benefits: extraction.benefits,
      }
      : null,
    extracted: isJob
      ? {
        title: extraction.title.trim(),
        company: extraction.company.trim() || null,
        location: extraction.location.trim() || null,
        description,
        postedAt: extraction.postedDate.trim() || null,
        expiresAt: null,
        employmentType: extraction.employmentType.trim() || null,
        workMode: extraction.workMode.trim() || (extraction.remote ? 'REMOTE' : null),
        salary: extraction.salaryRaw.trim() || null,
        url: capture.page.url,
      }
      : null,
  };
}

async function analyzeCompactCaptureWithN8nAi(
  userId: string,
  capture: CompactBrowserCapture,
  mode: 'extract' | 'both' = 'extract',
  cvText?: string,
  client = aiClient,
) {
  console.log('=++++++++++++>>>>>>>>>>>>=analyzeCompactCaptureWithN8nAi input:', {
    userId,
    capture,
    mode,
    cvText,
  });
  const extractPrompt = [
    'Analyze the supplied compact browser capture and extract the actual current job listing.',
    'Set pageType to exactly one of JOB_DETAIL, MULTIPLE_JOBS, JOB_SOURCE, or UNKNOWN. If uncertain or unable to classify, use UNKNOWN.',
    'Use JOB_DETAIL only when one specific job is clearly represented with a title and meaningful job-specific content.',
    'If multiple listings are present without a clearly selected job, use MULTIPLE_JOBS; never choose the first listing or merge unrelated jobs.',
    'Prioritize the selected job candidate, then valid JobPosting structured data, then job-specific headings and text.',
    'Do not treat company About, mission, navigation, footer, recommendations, or similar jobs as job requirements.',
    'Extract only facts present in the capture. Use empty strings and arrays for missing fields; never invent details.',
    'Return one JSON object with these exact keys and JSON types: pageType:string enum; title:string; company:string; location:string; remote:boolean; workMode:string; employmentType:string; salaryMin:number or null; salaryMax:number or null; salaryCurrency:string; salaryPeriod:string; salaryRaw:string; postedDate:string; applicationMethod:string; responsibilities:string[]; qualifications:string[]; skills:string[]; education:string[]; benefits:string[]; description:string; extractionNotes:string[].',
    'For missing scalar strings return "", for missing salaryMin/salaryMax return null, for missing remote return false, and for missing lists return []. Never return null for string or list fields. Never return a single string where a list is required.',
    'Keep description limited to job-specific role content. Put requirements, responsibilities, qualifications, skills, education, and benefits in their corresponding fields.',
  ].join(' ');
  const comparisonPrompt = [
    'Analyze the supplied compact browser capture and extract the actual current job listing, then compare that listing with the supplied CV text.',
    'Apply the same page classification and evidence rules as job extraction: use only one clearly represented role, do not merge listings, and never invent job or candidate facts.',
    'Set job.pageType to exactly one of JOB_DETAIL, MULTIPLE_JOBS, JOB_SOURCE, or UNKNOWN. If uncertain or unable to classify, use UNKNOWN.',
    'Assess requirements against explicit evidence in the CV. A missing item means it is not evidenced in the CV, not that the candidate lacks it.',
    'Return one JSON object with top-level job and comparison keys. job must contain the complete extraction object: pageType, title, company, location, remote, workMode, employmentType, salaryMin, salaryMax, salaryCurrency, salaryPeriod, salaryRaw, postedDate, applicationMethod, responsibilities, qualifications, skills, education, benefits, description, extractionNotes.',
    'comparison must contain matchScore (0-100), verdict, summary, matchedRequirements (array of {requirement,evidence}), and missingRequirements (array of {requirement,importance,suggestion}). Include concrete CV evidence for every matched requirement. Do not claim a match without evidence.',
    'Use empty strings and arrays for missing extraction fields; salaryMin/salaryMax should be null when absent and remote false when absent. Keep all arrays as arrays.',
  ].join(' ');

  const result = await client.generateJson<unknown>({
    task: AiTaskType.BROWSER_PAGE_ANALYSIS,
    userId,
    system: mode === 'both' ? comparisonPrompt : extractPrompt,
    payload: mode === 'both' ? { capture, cvText: cvText ?? '' } : capture,
  });
  const response = result && typeof result === 'object' && !Array.isArray(result)
    ? result as Record<string, unknown>
    : {};
  const extractionPayload = response.job && typeof response.job === 'object'
    ? response.job
    : result;
  const parsedResult = aiPageExtractionSchema.safeParse(extractionPayload);
  if (!parsedResult.success) {
    const details = parsedResult.error.issues
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    throw new Error(`N8N extraction response validation failed: ${details}`);
  }
  const extraction = parsedResult.data;
  const analysis = analysisFromAiExtraction(capture, extraction);
  const comparison = mode === 'both' ? aiComparisonSchema.safeParse(response.comparison) : null;
  return {
    ...analysis,
    ...(comparison?.success ? { aiComparison: comparison.data } : {}),
  };
}

async function analyzeCompactCaptureWithAi(userId: string, capture: CompactBrowserCapture) {
  if (aiClient.configured()) {
    const rawResult = await aiClient.generateJson<unknown>({
      task: AiTaskType.BROWSER_PAGE_ANALYSIS,
      userId,
      system: [
        'Evaluate this compact browser capture and extract the actual current job listing.',
        'Classify pageType as JOB_DETAIL, MULTIPLE_JOBS, JOB_SOURCE, or UNKNOWN.',
        'Use JOB_DETAIL only when one specific job is clearly represented with a title and meaningful job-specific content.',
        'If multiple listings are present without a clearly selected job, use MULTIPLE_JOBS; never choose the first listing or merge unrelated jobs.',
        'Prioritize the selected job candidate, then valid JobPosting structured data, then job-specific headings and text.',
        'Do not treat company About, mission, navigation, footer, recommendations, or similar jobs as job requirements.',
        'Extract only facts present in the capture. Use empty strings and arrays for missing fields; never invent details.',
        'Return exactly one JSON object with these exact keys and JSON types: pageType:string enum; title:string; company:string; location:string; remote:boolean; workMode:string; employmentType:string; salaryMin:number or null; salaryMax:number or null; salaryCurrency:string; salaryPeriod:string; salaryRaw:string; postedDate:string; applicationMethod:string; responsibilities:string[]; qualifications:string[]; skills:string[]; education:string[]; benefits:string[]; description:string; extractionNotes:string[].',
        'For missing scalar strings return "", for missing salaryMin/salaryMax return null, for missing remote return false, and for missing lists return []. Never return null for string or list fields. Never return a single string where a list is required.',
        'Use only these exact pageType values: JOB_DETAIL, MULTIPLE_JOBS, JOB_SOURCE, UNKNOWN.',
        'Output shape example: {"pageType":"UNKNOWN","title":"","company":"","location":"","remote":false,"workMode":"","employmentType":"","salaryMin":null,"salaryMax":null,"salaryCurrency":"","salaryPeriod":"","salaryRaw":"","postedDate":"","applicationMethod":"","responsibilities":[],"qualifications":[],"skills":[],"education":[],"benefits":[],"description":"","extractionNotes":[]}.',
        'Keep description limited to job-specific role content. Put requirements, responsibilities, qualifications, skills, education, and benefits in their corresponding fields.',
      ].join(' '),
      payload: capture,
    });
    const parsedResult = aiPageExtractionSchema.safeParse(rawResult);
    if (!parsedResult.success) {
      const details = parsedResult.error.issues
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; ');
      throw new Error(`Gemini extraction response validation failed: ${details}`);
    }
    const result = parsedResult.data;

    console.log('=++++++++++++>>>>>>>>>>>>=AI extraction result:', result);
    return analysisFromAiExtraction(capture, result);
  }

  const result = analyzePageInput({
    url: capture.page.url,
    pageTitle: capture.page.title,
    pageText: [
      capture.selectedJobCandidate?.text,
      ...capture.alternativeCandidates.map((candidate) => candidate.text),
      ...capture.headings.map((heading) => heading.text),
    ]
      .filter(Boolean)
      .join('\n'),
    structuredData: capture.jobPostingStructuredData,
  });
  return { ...result, pageType: result.isJob ? 'JOB_DETAIL' : 'UNKNOWN', extractionNotes: [] };
}

function createToken(): string {
  return `jic_${randomBytes(32).toString('base64url')}`;
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function objects(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(objects);
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  const graph = Array.isArray(record['@graph']) ? objects(record['@graph']) : [];
  return [record, ...graph];
}

function jobPostingFrom(value: unknown): Record<string, unknown> | undefined {
  return objects(value).find((record) => {
    const type = record['@type'];
    return type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'));
  });
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function companyFrom(posting?: Record<string, unknown>): string | undefined {
  const organization = posting?.hiringOrganization;
  if (!organization || typeof organization !== 'object') return undefined;
  return stringValue((organization as Record<string, unknown>).name);
}

function locationFrom(posting?: Record<string, unknown>): string | undefined {
  const locations = Array.isArray(posting?.jobLocation)
    ? posting?.jobLocation
    : posting?.jobLocation
      ? [posting.jobLocation]
      : [];
  for (const item of locations) {
    if (!item || typeof item !== 'object') continue;
    const address = (item as Record<string, unknown>).address;
    if (!address || typeof address !== 'object') continue;
    const record = address as Record<string, unknown>;
    const parts = [record.addressLocality, record.addressRegion, record.addressCountry]
      .map(stringValue)
      .filter(Boolean);
    if (parts.length) return parts.join(', ');
  }
  return undefined;
}

function cleanPageTitle(value?: string): string | undefined {
  if (!value) return undefined;
  return value.split(/\s+[|–—-]\s+/)[0]?.trim() || value.trim();
}

function analyzePageInput(input: {
  url: string;
  pageTitle?: string;
  selectedText?: string;
  pageText?: string;
  structuredData?: unknown;
}) {
  const posting = jobPostingFrom(input.structuredData);
  const extracted = extractJobComparisonContent(input);
  const isJob = Boolean(extracted.title && extracted.hasJobContent);
  return {
    isJob,
    confidence: posting && extracted.confidence === 'HIGH' ? 'HIGH' : extracted.confidence,
    extracted: isJob
      ? {
        title: extracted.title ?? 'Job opportunity',
        company: extracted.company ?? companyFrom(posting) ?? null,
        location: extracted.location ?? locationFrom(posting) ?? null,
        description: extracted.description,
        postedAt: stringValue(posting?.datePosted) ?? null,
        expiresAt: stringValue(posting?.validThrough) ?? null,
        employmentType: extracted.employmentType ?? stringValue(posting?.employmentType) ?? null,
        workMode: extracted.workMode ?? null,
        salary: extracted.salary ?? null,
        url: input.url,
      }
      : null,
  };
}

async function analyzePageWithFallback(
  userId: string,
  input: {
    url: string;
    pageTitle?: string;
    selectedText?: string;
    pageText?: string;
    structuredData?: unknown;
  },
) {
  const deterministic = analyzePageInput(input);
  if (
    deterministic.isJob ||
    !aiClient.configured() ||
    !(input.pageText ?? input.selectedText)?.trim()
  )
    return deterministic;

  try {
    const result = await aiClient.generateJson<{
      isJob: boolean;
      confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
      title?: string | null;
      company?: string | null;
      location?: string | null;
      description?: string | null;
      postedAt?: string | null;
      expiresAt?: string | null;
      employmentType?: string | null;
    }>({
      task: AiTaskType.BROWSER_PAGE_ANALYSIS,
      userId,
      system: [
        'Determine whether the supplied browser page is a specific job vacancy page.',
        'Do not classify generic career homepages, search result pages, company about pages or articles as a vacancy unless one specific role is clearly described.',
        'Extract only facts present in the page text. Never invent employer, location, dates or employment type.',
        'Return JSON only with isJob, confidence, title, company, location, description, postedAt, expiresAt and employmentType.',
      ].join(' '),
      payload: {
        url: input.url,
        originalUrl: input.url,
        pageTitle: input.pageTitle,
        selectedText: input.selectedText?.slice(0, 12_000),
        pageText: input.pageText?.slice(0, 30_000),
      },
    });

    if (
      !result.isJob ||
      !result.title?.trim() ||
      !result.description?.trim() ||
      result.description.trim().length < 80
    )
      return deterministic;
    const cleanedDescription = [
      `Job Title\n${result.title.trim()}`,
      `Description\n${cleanJobDescription(result.description)}`,
    ].join('\n\n');
    return {
      isJob: true,
      confidence: result.confidence ?? 'MEDIUM',
      extracted: {
        title: result.title.trim(),
        company: result.company?.trim() || null,
        location: result.location?.trim() || null,
        description: cleanedDescription.slice(0, 100_000),
        postedAt: result.postedAt?.trim() || null,
        expiresAt: result.expiresAt?.trim() || null,
        employmentType: result.employmentType?.trim() || null,
        workMode: null,
        salary: null,
        url: input.url,
      },
    };
  } catch {
    return deterministic;
  }
}

export const browserCompanionService = {
  async listTokens(userId: string) {
    return prisma.browserCompanionToken.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createToken(userId: string, input: { name: string; expiresInDays?: number }) {
    const token = createToken();
    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 86_400_000)
      : null;

    const record = await prisma.browserCompanionToken.create({
      data: {
        userId,
        name: input.name,
        tokenHash: hashSessionToken(token),
        tokenPrefix: token.slice(0, 12),
        ...(expiresAt ? { expiresAt } : {}),
      },
      select: { id: true, name: true, tokenPrefix: true, createdAt: true, expiresAt: true },
    });

    // The clear token is returned once. Only its SHA-256 hash is persisted.
    return { ...record, token };
  },

  async revokeToken(userId: string, tokenId: string) {
    const token = await prisma.browserCompanionToken.findFirst({ where: { id: tokenId, userId } });
    if (!token) throw new NotFoundError('Browser companion token not found.');
    return prisma.browserCompanionToken.update({
      where: { id: token.id },
      data: { revokedAt: new Date() },
    });
  },

  async listCvs(userId: string, profileId?: string) {
    const cvs = await cvService.list(userId, profileId);
    return cvs.map((cv) => ({
      id: cv.id,
      name: cv.name,
      isMaster: cv.isMaster,
      latestVersion: cv.versions[0]
        ? {
          id: cv.versions[0].id,
          versionNumber: cv.versions[0].versionNumber,
          label: cv.versions[0].label,
        }
        : null,
      profileLinks: cv.profileLinks,
    }));
  },

  async analyzePage(userId: string, capture: CompactBrowserCapture) {
    const cacheKey = browserAnalysisCacheKey(capture);
    const cached = await prisma.browserPageAnalysisCache.findUnique({ where: { cacheKey } });
    let analysis: CompactBrowserAnalysis;
    let analysisOrigin: 'CACHE' | 'FRESH';

    if (cached) {
      analysis = cached.result as CompactBrowserAnalysis;
      analysisOrigin = 'CACHE';
    } else {
      analysis = await analyzeCompactCaptureWithN8nAi(userId, capture);
      await prisma.browserPageAnalysisCache.upsert({
        where: { cacheKey },
        create: { cacheKey, pageUrl: capture.page.url, result: analysis as Prisma.InputJsonValue },
        update: { result: analysis as Prisma.InputJsonValue, pageUrl: capture.page.url },
      });
      analysisOrigin = 'FRESH';
    }

    const resolution = await sourceService.resolveByUrl(capture.page.url);
    return {
      ...analysis,
      analysisOrigin,
      acquisitionMethod: AcquisitionMethod.BROWSER_COMPANION,
      detectedSource: resolution.source
        ? {
          id: resolution.source.id,
          name: resolution.source.name,
          sourceType: resolution.source.sourceType,
        }
        : null,
      sourceClassification: resolution.matched ? 'MATCHED' : 'UNCLASSIFIED',
    };
  },

  async sourcesForUrl(url: string) {
    const [resolution, sources] = await Promise.all([
      sourceService.resolveByUrl(url),
      prisma.source.findMany({
        where: { active: true },
        select: { id: true, name: true, sourceType: true, baseUrl: true },
        orderBy: [{ systemOwned: 'asc' }, { name: 'asc' }],
      }),
    ]);
    const unclassified = resolution.matched ? null : await sourceService.ensureUnclassifiedSource();
    return { detectedSource: resolution.source, unclassified, sources };
  },

  // the code below uses the gemini configuration direct

  // async comparePage(
  //   userId: string,
  //   input: {
  //     url: string;
  //     pageTitle?: string;
  //     selectedText?: string;
  //     pageText?: string;
  //     structuredData?: unknown;
  //     cvVersionId: string;
  //   },
  // ) {
  //   const analysis = await analyzePageWithFallback(userId, input);
  //   if (!analysis.isJob || !analysis.extracted) return { ...analysis, match: null };
  //   const version = await cvService.getVersion(userId, input.cvVersionId);
  //   const requirements = extractRequirementsFromDescription(analysis.extracted.description);
  //   const items = requirements.map((requirement) => ({
  //     requirementText: requirement.text,
  //     kind: requirement.kind,
  //     priority: requirement.priority,
  //     ...compareRequirementToCv(version.plainText, requirement.text),
  //   }));
  //   const aggregate = scoreRequirementMatches(
  //     items.map((item) => ({ status: item.status, priority: item.priority })),
  //   );
  //   return {
  //     ...analysis,
  //     match: {
  //       cv: {
  //         id: version.cv.id,
  //         name: version.cv.name,
  //         versionId: version.id,
  //         versionNumber: version.versionNumber,
  //       },
  //       score: aggregate.score,
  //       evidencedCount: aggregate.evidenced,
  //       partialCount: aggregate.partial,
  //       notEvidencedCount: aggregate.notEvidenced,
  //       needsConfirmationCount: aggregate.needsConfirmation,
  //       items,
  //     },
  //   };
  // },

  // tis configuration uses n8n AI client for comparison and extraction, which is more advanced and can provide better results.
  // async comparePage(
  //   userId: string,
  //   input: {
  //     capture: CompactBrowserCapture;
  //     cvVersionId: string;
  //   },
  // ) {
  //   const version = await cvService.getVersion(userId, input.cvVersionId);
  //   const analysis = await analyzeCompactCaptureWithN8nAi(
  //     userId,
  //     input.capture,
  //     'both',
  //     version.plainText,
  //   );
  //   if (analysis.pageType !== 'JOB_DETAIL' || !analysis.extracted) {
  //     return {
  //       ...analysis,
  //       match: null,
  //     };
  //   }

  //   const requirements = extractRequirementsFromDescription(analysis.extracted.description);

  //   const localItems = requirements.map((requirement) => ({
  //     requirementText: requirement.text,
  //     kind: requirement.kind,
  //     priority: requirement.priority,
  //     ...compareRequirementToCv(version.plainText, requirement.text),
  //   }));

  //   const aggregate = scoreRequirementMatches(
  //     localItems.map((item) => ({
  //       status: item.status,
  //       priority: item.priority,
  //     })),
  //   );

  //   const aiComparison = analysis.aiComparison;
  //   const items = aiComparison
  //     ? [
  //         ...(aiComparison.matchedRequirements ?? []).map((item) => ({
  //           requirementText: item.requirement,
  //           kind: 'MATCHED',
  //           status: CvMatchStatus.EVIDENCED,
  //           evidence: item.evidence,
  //         })),
  //         ...(aiComparison.missingRequirements ?? []).map((item) => ({
  //           requirementText: item.requirement,
  //           kind: item.importance || 'REQUIRED',
  //           status: item.importance.toUpperCase() === 'REQUIRED'
  //             ? CvMatchStatus.NEEDS_CONFIRMATION
  //             : CvMatchStatus.NOT_EVIDENCED,
  //           suggestion: item.suggestion,
  //         })),
  //       ]
  //     : localItems;
  //   const counts = {
  //     evidenced: items.filter((item) => item.status === CvMatchStatus.EVIDENCED).length,
  //     partial: items.filter((item) => item.status === CvMatchStatus.PARTIAL).length,
  //     notEvidenced: items.filter((item) => item.status === CvMatchStatus.NOT_EVIDENCED).length,
  //     needsConfirmation: items.filter((item) => item.status === CvMatchStatus.NEEDS_CONFIRMATION).length,
  //   };

  //   return {
  //     ...analysis,
  //     match: {
  //       cv: {
  //         id: version.cv.id,
  //         name: version.cv.name,
  //         versionId: version.id,
  //         versionNumber: version.versionNumber,
  //       },
  //       score: aiComparison?.matchScore ?? aggregate.score,
  //       verdict: aiComparison?.verdict,
  //       summary: aiComparison?.summary,
  //       improvedCv: aiComparison?.improvedCv,
  //       evidencedCount: counts.evidenced,
  //       partialCount: counts.partial,
  //       notEvidencedCount: counts.notEvidenced,
  //       needsConfirmationCount: counts.needsConfirmation,
  //       items,
  //     },
  //   };
  // },

  // this configuration  should use openRouter
  async comparePage(
    userId: string,
    input: {
      capture: CompactBrowserCapture;
      cvVersionId: string;
    },
  ) {
    const cacheKey = browserComparisonCacheKey(userId, input.capture, input.cvVersionId);
    const cached = await prisma.browserPageAnalysisCache.findUnique({ where: { cacheKey } });
    if (cached) {
      return {
        ...(cached.result as BrowserPageComparisonResult),
        comparisonOrigin: 'CACHE' as const,
      };
    }

    const version = await cvService.getVersion(userId, input.cvVersionId);
    const analysis = await analyzeCompactCaptureWithN8nAi(
      userId,
      input.capture,
      'both',
      version.plainText,
      aiClient,
    );
    if (analysis.pageType !== 'JOB_DETAIL' || !analysis.extracted) {
      const result = {
        ...analysis,
        match: null,
        comparisonOrigin: 'FRESH' as const,
      };
      await saveBrowserComparisonCache(cacheKey, input.capture.page.url, result);
      return result;
    }

    const requirements = extractRequirementsFromDescription(analysis.extracted.description);

    const localItems = requirements.map((requirement) => ({
      requirementText: requirement.text,
      kind: requirement.kind,
      priority: requirement.priority,
      ...compareRequirementToCv(version.plainText, requirement.text),
    }));

    const aggregate = scoreRequirementMatches(
      localItems.map((item) => ({
        status: item.status,
        priority: item.priority,
      })),
    );

    const aiComparison = analysis.aiComparison;
    const items = aiComparison
      ? [
        ...(aiComparison.matchedRequirements ?? []).map((item) => ({
          requirementText: item.requirement,
          kind: 'MATCHED',
          status: CvMatchStatus.EVIDENCED,
          evidence: item.evidence,
        })),
        ...(aiComparison.missingRequirements ?? []).map((item) => ({
          requirementText: item.requirement,
          kind: item.importance || 'REQUIRED',
          status: item.importance.toUpperCase() === 'REQUIRED'
            ? CvMatchStatus.NEEDS_CONFIRMATION
            : CvMatchStatus.NOT_EVIDENCED,
          suggestion: item.suggestion,
        })),
      ]
      : localItems;
    const counts = {
      evidenced: items.filter((item) => item.status === CvMatchStatus.EVIDENCED).length,
      partial: items.filter((item) => item.status === CvMatchStatus.PARTIAL).length,
      notEvidenced: items.filter((item) => item.status === CvMatchStatus.NOT_EVIDENCED).length,
      needsConfirmation: items.filter((item) => item.status === CvMatchStatus.NEEDS_CONFIRMATION).length,
    };

    const result = {
      ...analysis,
      match: {
        cv: {
          id: version.cv.id,
          name: version.cv.name,
          versionId: version.id,
          versionNumber: version.versionNumber,
        },
        score: aiComparison?.matchScore ?? aggregate.score,
        verdict: aiComparison?.verdict,
        summary: aiComparison?.summary,
        improvedCv: aiComparison?.improvedCv,
        evidencedCount: counts.evidenced,
        partialCount: counts.partial,
        notEvidencedCount: counts.notEvidenced,
        needsConfirmationCount: counts.needsConfirmation,
        items,
      },
      comparisonOrigin: 'FRESH' as const,
    };
    await saveBrowserComparisonCache(cacheKey, input.capture.page.url, result);
    return result;
  },

  async buildCvPreview(userId: string, input: {
    capture: CompactBrowserCapture;
    cvVersionId: string;
    selectedRequirements: Array<{
      requirementText: string;
      placement: 'SUMMARY' | 'SKILLS' | 'EXPERIENCE' | 'EDUCATION' | 'OTHER';
    }>;
  }) {
    const cacheKey = browserComparisonCacheKey(userId, input.capture, input.cvVersionId);
    const cached = await prisma.browserPageAnalysisCache.findUnique({ where: { cacheKey } });
    if (!cached) {
      throw new BadRequestError('Compare this CV with the job first so its cached comparison can be used.');
    }

    const cachedResult = cached.result as BrowserPageComparisonResult;
    if (!cachedResult.match || cachedResult.pageType !== 'JOB_DETAIL' || !cachedResult.extracted) {
      throw new BadRequestError('The cached comparison does not contain a confirmed job listing.');
    }

    const fillableStatuses = new Set<CvMatchStatus>([
      CvMatchStatus.PARTIAL,
      CvMatchStatus.NOT_EVIDENCED,
      CvMatchStatus.NEEDS_CONFIRMATION,
    ]);
    const missingItems = cachedResult.match.items.filter((item) => fillableStatuses.has(item.status));
    const selected = input.selectedRequirements.map((choice) => {
      const comparisonItem = missingItems.find((item) => item.requirementText === choice.requirementText);
      if (!comparisonItem) {
        throw new BadRequestError(`Selected requirement was not a gap in the cached comparison: ${choice.requirementText}`);
      }
      return {
        requirement: comparisonItem.requirementText,
        currentStatus: comparisonItem.status,
        placement: choice.placement,
      };
    });

    const version = await cvService.getVersion(userId, input.cvVersionId);
    const job = cachedResult.extracted;
    const generated = await aiClient.generateJson<{ draftText?: string }>({
      task: AiTaskType.CV_TAILORING,
      userId,
      system: [
        'Revise the supplied full CV into a job-targeted draft using only the selected gaps from the cached CV and job comparison.',
        'The user has reviewed and explicitly selected each requirement, confirming it is a real capability they want represented. Add each selected requirement concisely in its requested CV section.',
        'Use the original CV as the source for concrete evidence and details. Do not invent employers, projects, dates, metrics, credentials, achievements, or specific experience examples. Do not imply a specific past role or accomplishment unless it is present in the original CV.',
        'Preserve every other original CV fact. Do not rewrite unrelated sections. Keep a readable plain-text CV with headings and line breaks. Return the complete CV, not a summary.',
        'Return exactly one JSON object: {"draftText":"complete revised CV text"}.',
      ].join(' '),
      payload: {
        originalCv: { plainText: version.plainText },
        job: {
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
        },
        comparisonGapsSelectedByUser: selected,
      },
    });

    const draftText = generated.draftText?.trim();
    if (
      !draftText ||
      draftText.length > 250_000 ||
      draftText.length < version.plainText.trim().length * 0.5
    ) {
      throw new BadRequestError('The generated draft was incomplete. Please try again.');
    }

    return {
      cv: { id: version.cv.id, name: version.cv.name, versionId: version.id, versionNumber: version.versionNumber },
      job: { title: job.title, company: job.company, url: job.url },
      draftText,
      selectedRequirements: selected,
      requirementCoverage: selected.map((item) => ({
        requirement: item.requirement,
        ...compareRequirementToCv(draftText, item.requirement),
      })),
      comparisonOrigin: 'CACHE' as const,
    };
  },

  async context(userId: string, url: string) {
    const { normalizedUrl, listing } = await jobUrlService.findExisting(url, userId);
    if (!listing) return { found: false as const, normalizedUrl };
    const job = await prisma.job.findUnique({
      where: { id: listing.job.id },
      include: {
        company: true,
        userStates: { where: { userId } },
        applications: { where: { userId }, orderBy: { appliedAt: 'desc' }, take: 1 },
      },
    });
    if (!job) return { found: false as const, normalizedUrl };
    return {
      found: true as const,
      normalizedUrl,
      jobId: job.id,
      title: job.title,
      company: job.company?.name ?? null,
      disposition: job.userStates[0]?.disposition ?? 'NONE',
      application: job.applications[0] ?? null,
    };
  },

  async capture(
    userId: string,
    input: {
      url: string;
      pageTitle?: string;
      selectedText?: string;
      pageText?: string;
      structuredData?: unknown;
      action: 'SAVE' | 'APPLIED';
      note?: string;
      searchProfileId?: string;
      cvVersionId?: string;
      sourceId?: string;
      private: boolean;
    },
  ) {
    const verification = await assertSavableUrl(input.url, 'Job URL');
    const canonicalUrl = normalizeJobUrl(verification.finalUrl || input.url);
    const resolved = input.sourceId
      ? { source: await prisma.source.findUnique({ where: { id: input.sourceId } }), matched: true }
      : await sourceService.resolveByUrl(input.url);
    const source = resolved.source ?? (await sourceService.ensureUnclassifiedSource());
    if (!source) throw new NotFoundError('Job Source not found.');
    const posting = jobPostingFrom(input.structuredData);
    const analysis = await analyzePageWithFallback(userId, input);
    const detected = analysis.extracted;
    const title = detected?.title ?? stringValue(posting?.title) ?? cleanPageTitle(input.pageTitle);
    console.log('=++++++++++++>>>>>>>>>>>>=Detected title:', title, 'from', {
      detected,
      posting,
      input,
    });
    if (!title) {
      throw new BadRequestError(
        'A job title could not be identified. Select the job title or enter it in the extension before saving.',
      );
    }

    const description =
      detected?.description ??
      stringValue(posting?.description) ??
      input.selectedText ??
      input.pageText;
    const raw: RawJobListing = {
      sourceId: source.id,
      acquisitionMethod: AcquisitionMethod.BROWSER_COMPANION,
      sourceUrl: canonicalUrl,
      applyUrl: canonicalUrl,
      title,
      ...(detected?.company
        ? { company: detected.company }
        : companyFrom(posting)
          ? { company: companyFrom(posting) }
          : {}),
      ...(detected?.location
        ? { location: detected.location }
        : locationFrom(posting)
          ? { location: locationFrom(posting) }
          : {}),
      ...(description ? { description } : {}),
      ...(detected?.postedAt
        ? { postedAt: detected.postedAt }
        : stringValue(posting?.datePosted)
          ? { postedAt: stringValue(posting?.datePosted) }
          : {}),
      ...(detected?.expiresAt
        ? { expiresAt: detected.expiresAt }
        : stringValue(posting?.validThrough)
          ? { expiresAt: stringValue(posting?.validThrough) }
          : {}),
      ...(detected?.employmentType
        ? { employmentType: detected.employmentType }
        : stringValue(posting?.employmentType)
          ? { employmentType: stringValue(posting?.employmentType) }
          : {}),
      extractionMethod: ExtractionMethod.MANUAL,
      discoveredAt: new Date(),
      rawPayload: json({
        url: input.url,
        pageTitle: input.pageTitle,
        selectedText: input.selectedText,
        pageText: input.pageText,
        structuredData: input.structuredData,
        channel: 'browser_companion',
      }),
    };

    const outcome = await jobIngestionService.processOne(raw, {
      createdByUserId: userId,
      visibility: input.private ? JobVisibility.PRIVATE : JobVisibility.PUBLIC,
    });

    if (!outcome.result) {
      throw new BadRequestError(
        outcome.errorMessage ??
        outcome.reasons?.join(' ') ??
        'The page could not be saved as a job.',
      );
    }

    const cvMatch = input.cvVersionId
      ? await cvService.compare(userId, outcome.result.jobId, input.cvVersionId, false)
      : null;

    await prisma.userJobState.upsert({
      where: { userId_jobId: { userId, jobId: outcome.result.jobId } },
      create: {
        userId,
        jobId: outcome.result.jobId,
        disposition: UserJobDisposition.SAVED,
        savedAt: new Date(),
        firstViewedAt: new Date(),
        lastViewedAt: new Date(),
        ...(input.cvVersionId ? { preferredCvVersionId: input.cvVersionId } : {}),
      },
      update: {
        disposition: UserJobDisposition.SAVED,
        savedAt: new Date(),
        lastViewedAt: new Date(),
        ...(input.cvVersionId ? { preferredCvVersionId: input.cvVersionId } : {}),
      },
    });

    if (input.note) {
      await prisma.jobNote.create({
        data: { userId, jobId: outcome.result.jobId, note: input.note },
      });
    }

    let application = null;
    if (input.action === 'APPLIED') {
      application = await applicationService.create(userId, {
        jobId: outcome.result.jobId,
        sourceListingId: outcome.result.listingId,
        foundSourceId: source.id,
        appliedSourceId: source.id,
        whereAppliedUrl: canonicalUrl,
        ...(input.searchProfileId ? { searchProfileId: input.searchProfileId } : {}),
        ...(input.cvVersionId ? { cvVersionId: input.cvVersionId } : {}),
        ...(input.note ? { note: input.note } : {}),
      });
    }

    return {
      jobId: outcome.result.jobId,
      listingId: outcome.result.listingId,
      existingJob: !outcome.result.newJob,
      duplicate: outcome.result.duplicate,
      confidence: outcome.result.confidence,
      cvMatch,
      application,
    };
  },

  async prepareCv(
    userId: string,
    input: {
      url: string;
      pageTitle?: string;
      selectedText?: string;
      pageText?: string;
      structuredData?: unknown;
      action: 'SAVE' | 'APPLIED';
      note?: string;
      searchProfileId?: string;
      cvVersionId: string;
      sourceId?: string;
      private: boolean;
    },
  ) {
    const capture = await this.capture(userId, input);
    const session = await cvService.createTailoringSession(userId, {
      jobId: capture.jobId,
      cvVersionId: input.cvVersionId,
      ...(capture.cvMatch?.id ? { matchId: capture.cvMatch.id } : {}),
    });
    return { ...capture, session };
  },
};
