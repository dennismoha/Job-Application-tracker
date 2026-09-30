import { createHash } from 'node:crypto';

import {
  AcquisitionMethod,
  DateConfidence,
  EmploymentType,
  FreshnessStatus,
  RemoteType,
  SalaryPeriod,
} from '@prisma/client';

import { canonicalizeUrl, stripHtml } from '../acquisition/collectors/html-utils.js';
import type { RawJobListing } from '../acquisition/collectors/collector.types.js';
import type { NormalizedJobCandidate } from './normalization.types.js';

const TITLE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bmaths?\b/gi, 'mathematics'],
  [/\bteacher of\b/gi, 'teacher'],
  [/\bclass(?:room)? teacher\b/gi, 'homeroom teacher'],
  [/\bfull[ -]?stack\b/gi, 'full stack'],
  [/\breact\.js\b/gi, 'react'],
  [/\bnodejs\b/gi, 'node.js'],
];

const NOISE_WORDS = [
  'urgent',
  'urgently',
  'required',
  'wanted',
  'hiring',
  'immediate start',
  'immediate',
  'vacancy',
  'job opportunity',
];

function tidy(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeTitle(rawTitle: string): string {
  let value = tidy(stripHtml(rawTitle)).toLowerCase();

  for (const [pattern, replacement] of TITLE_REPLACEMENTS) {
    value = value.replace(pattern, replacement);
  }

  for (const word of NOISE_WORDS) {
    value = value.replace(new RegExp(`\\b${word.replace(/ /g, '\\s+')}\\b`, 'gi'), ' ');
  }

  value = value
    .replace(/\b(?:ay|academic year)\s*20\d{2}\s*[\/-]\s*\d{2,4}\b/gi, ' ')
    .replace(/\b20\d{2}\s*[\/-]\s*20?\d{2}\b/g, ' ')
    .replace(/[^a-z0-9.+# -]+/g, ' ');

  return tidy(value);
}

export function normalizeCompanyName(rawCompany: string): string {
  return tidy(rawCompany.toLowerCase())
    .replace(/\b(l\.l\.c\.?|llc|ltd\.?|limited|inc\.?|incorporated|pjsc)\b/gi, ' ')
    .replace(/\binternational\s+school\b/gi, 'international school')
    .replace(/\bintl\.?\b/gi, 'international')
    .replace(/[^a-z0-9& -]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLocation(rawLocation?: string): { city?: string; country?: string; locationText?: string } {
  if (!rawLocation?.trim()) return {};
  const cleaned = tidy(rawLocation);
  const lower = cleaned.toLowerCase();

  const uaeCities: Array<[string, string]> = [
    ['abu dhabi', 'Abu Dhabi'],
    ['dubai', 'Dubai'],
    ['sharjah', 'Sharjah'],
    ['al ain', 'Al Ain'],
    ['ras al khaimah', 'Ras Al Khaimah'],
    ['fujairah', 'Fujairah'],
    ['ajman', 'Ajman'],
    ['umm al quwain', 'Umm Al Quwain'],
  ];

  const city = uaeCities.find(([needle]) => lower.includes(needle))?.[1];
  const isUae = /\buae\b|united arab emirates|dubai|abu dhabi|sharjah|al ain|ras al khaimah|fujairah|ajman|umm al quwain/i.test(cleaned);

  return {
    ...(city ? { city } : {}),
    ...(isUae ? { country: 'AE' } : {}),
    locationText: cleaned,
  };
}

function parseRelativeDate(value: string, now: Date): { date?: Date; confidence: DateConfidence } {
  const clean = tidy(value);
  const direct = new Date(clean);

  if (!Number.isNaN(direct.getTime())) {
    return { date: direct, confidence: DateConfidence.EXACT };
  }

  const lower = clean.toLowerCase();
  if (lower === 'today') return { date: now, confidence: DateConfidence.INFERRED };
  if (lower === 'yesterday') return { date: new Date(now.getTime() - 86_400_000), confidence: DateConfidence.INFERRED };

  const relative = lower.match(/(\d+)\s+(hour|day|week|month)s?\s+ago/);
  if (!relative?.[1] || !relative[2]) return { confidence: DateConfidence.UNKNOWN };

  const amount = Number(relative[1]);
  const multiplier = relative[2] === 'hour'
    ? 3_600_000
    : relative[2] === 'day'
      ? 86_400_000
      : relative[2] === 'week'
        ? 604_800_000
        : 2_592_000_000;

  return { date: new Date(now.getTime() - amount * multiplier), confidence: DateConfidence.INFERRED };
}

function parseOptionalDate(value: string | undefined, now: Date): { date?: Date; confidence: DateConfidence } {
  if (!value) return { confidence: DateConfidence.UNKNOWN };
  return parseRelativeDate(value, now);
}

function normalizeEmploymentType(value?: string): EmploymentType {
  if (!value) return EmploymentType.UNSPECIFIED;
  const lower = value.toLowerCase();
  if (/full[ -]?time/.test(lower)) return EmploymentType.FULL_TIME;
  if (/part[ -]?time/.test(lower)) return EmploymentType.PART_TIME;
  if (/contract|contractor/.test(lower)) return EmploymentType.CONTRACT;
  if (/temporary|temp\b/.test(lower)) return EmploymentType.TEMPORARY;
  if (/intern/.test(lower)) return EmploymentType.INTERNSHIP;
  return EmploymentType.OTHER;
}

function normalizeRemoteType(location?: string, description?: string): RemoteType {
  const text = `${location ?? ''} ${description ?? ''}`.toLowerCase();
  if (/\bhybrid\b/.test(text)) return RemoteType.HYBRID;
  if (/\bremote\b|work from home/.test(text)) return RemoteType.REMOTE;
  if (location?.trim()) return RemoteType.ONSITE;
  return RemoteType.UNSPECIFIED;
}

function normalizeSalary(value?: string): {
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod: SalaryPeriod;
  salaryText?: string;
} {
  if (!value?.trim()) return { salaryPeriod: SalaryPeriod.UNSPECIFIED };
  const text = tidy(stripHtml(value));
  const upper = text.toUpperCase();
  const currency = ['AED', 'USD', 'EUR', 'GBP', 'KES'].find((item) => upper.includes(item));
  const matches = [...text.matchAll(/(?:AED|USD|EUR|GBP|KES|[$€£])?\s*([0-9][0-9,]*(?:\.\d+)?)/gi)]
    .map((match) => Number((match[1] ?? '').replace(/,/g, '')))
    .filter((number) => Number.isFinite(number));

  const period = /hour|hourly|\/hr/i.test(text)
    ? SalaryPeriod.HOURLY
    : /day|daily/i.test(text)
      ? SalaryPeriod.DAILY
      : /week|weekly/i.test(text)
        ? SalaryPeriod.WEEKLY
        : /month|monthly|\/mo/i.test(text)
          ? SalaryPeriod.MONTHLY
          : /year|annual|yearly|per annum/i.test(text)
            ? SalaryPeriod.YEARLY
            : SalaryPeriod.UNSPECIFIED;

  return {
    ...(matches[0] !== undefined ? { salaryMin: matches[0] } : {}),
    ...(matches[1] !== undefined ? { salaryMax: matches[1] } : {}),
    ...(currency ? { salaryCurrency: currency } : {}),
    salaryPeriod: period,
    salaryText: text,
  };
}

function categoryFor(title: string): string | undefined {
  if (/mathematics/.test(title)) return 'teaching-mathematics';
  if (/chemistry/.test(title)) return 'teaching-chemistry';
  if (/homeroom|primary teacher|elementary teacher|class teacher/.test(title)) return 'teaching-homeroom';
  if (/science|biology|physics/.test(title)) return 'teaching-science';
  if (/teacher|teaching|educator/.test(title)) return 'teaching';
  if (/frontend|react/.test(title)) return 'software-frontend';
  if (/backend|node\.js|api engineer/.test(title)) return 'software-backend';
  if (/full stack/.test(title)) return 'software-full-stack';
  if (/ai|automation|agent/.test(title)) return 'software-ai-automation';
  if (/software|developer|engineer/.test(title)) return 'software-engineering';
  if (/annotation|annotator/.test(title)) return 'data-annotation';
  return undefined;
}

function academicYearFrom(text: string): string | undefined {
  return text.match(/\b(20\d{2})\s*[\/-]\s*(20?\d{2})\b/)?.slice(1, 3).join('/')
    ?? text.match(/\b(?:AY|academic year)\s*(20\d{2}\s*[\/-]\s*\d{2,4})\b/i)?.[1];
}

function freshness(postedAt: Date | undefined, discoveredAt: Date): FreshnessStatus {
  if (!postedAt) return FreshnessStatus.UNKNOWN;
  const days = Math.max(0, (discoveredAt.getTime() - postedAt.getTime()) / 86_400_000);
  if (days <= 3) return FreshnessStatus.NEW;
  if (days <= 7) return FreshnessStatus.RECENT;
  if (days <= 14) return FreshnessStatus.AGING;
  if (days <= 30) return FreshnessStatus.OLD;
  return FreshnessStatus.VERY_OLD;
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function normalizeRawListing(raw: RawJobListing): NormalizedJobCandidate {
  if (!raw.title?.trim()) throw new Error('A job title is required before normalization.');

  const rawTitle = tidy(stripHtml(raw.title));
  const normalizedTitle = normalizeTitle(rawTitle);
  const companyName = raw.company ? tidy(stripHtml(raw.company)) : undefined;
  const normalizedCompanyName = companyName ? normalizeCompanyName(companyName) : undefined;
  const location = normalizeLocation(raw.location);
  const description = raw.description ? tidy(stripHtml(raw.description)).slice(0, 100_000) : undefined;
  const posted = parseOptionalDate(raw.postedAt, raw.discoveredAt);
  const expires = parseOptionalDate(raw.expiresAt, raw.discoveredAt);
  const start = parseOptionalDate(raw.startDate, raw.discoveredAt);
  const salary = normalizeSalary(raw.salary);
  const sourceUrl = raw.sourceUrl ? canonicalizeUrl(raw.sourceUrl) : undefined;
  const applyUrl = raw.applyUrl ? canonicalizeUrl(raw.applyUrl) : undefined;
  const academicYear = academicYearFrom(`${rawTitle} ${description ?? ''}`);
  const fingerprint = hash(`${normalizedCompanyName ?? 'unknown'}|${normalizedTitle}|${location.city ?? location.country ?? 'unknown'}`);
  const contentHash = hash(JSON.stringify({
    title: normalizedTitle,
    company: normalizedCompanyName,
    location: location.locationText,
    description,
    postedAt: posted.date?.toISOString(),
    applyUrl,
  }));

  return {
    sourceId: raw.sourceId,
    acquisitionMethod: raw.acquisitionMethod ?? AcquisitionMethod.MANUAL,
    extractionMethod: raw.extractionMethod,
    ...(raw.externalId ? { externalId: raw.externalId } : {}),
    ...(raw.requisitionId ? { requisitionId: raw.requisitionId } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(applyUrl ? { applyUrl } : {}),
    rawTitle,
    title: rawTitle,
    normalizedTitle,
    ...(companyName ? { companyName } : {}),
    ...(normalizedCompanyName ? { normalizedCompanyName } : {}),
    ...(raw.location ? { rawLocation: raw.location } : {}),
    ...location,
    ...(description ? { description } : {}),
    remoteType: normalizeRemoteType(raw.location, description),
    employmentType: normalizeEmploymentType(raw.employmentType),
    ...salary,
    ...(posted.date ? { postedAt: posted.date } : {}),
    postedDateConfidence: posted.confidence,
    ...(expires.date ? { expiresAt: expires.date } : {}),
    ...(start.date ? { startDate: start.date } : {}),
    ...(academicYear ? { academicYear } : {}),
    freshnessStatus: freshness(posted.date, raw.discoveredAt),
    ...(categoryFor(normalizedTitle) ? { categorySlug: categoryFor(normalizedTitle) } : {}),
    fingerprint,
    contentHash,
    discoveredAt: raw.discoveredAt,
    rawPayload: raw.rawPayload,
  };
}
