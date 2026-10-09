import { CvMatchStatus, CvRequirementKind } from '@prisma/client';

export interface StructuredCvData {
  personal?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    headline?: string;
    links?: string[];
  };
  summary?: string;
  experience?: Array<{
    role?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    bullets?: string[];
  }>;
  education?: Array<{
    qualification?: string;
    institution?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    details?: string[];
  }>;
  skills?: string[];
  certifications?: string[];
  projects?: Array<{ name?: string; description?: string; bullets?: string[] }>;
  languages?: string[];
  additional?: Array<{ title?: string; items?: string[] }>;
}

export interface ExtractedRequirement {
  kind: CvRequirementKind;
  text: string;
  normalizedKey: string;
  priority: number;
}

export interface RequirementMatchResult {
  status: CvMatchStatus;
  evidence?: string;
  suggestion?: string;
}

export interface JobComparisonContentInput {
  pageTitle?: string;
  pageText?: string;
  selectedText?: string;
  structuredData?: unknown;
}

export interface JobComparisonContent {
  title?: string;
  company?: string;
  location?: string;
  employmentType?: string;
  workMode?: string;
  salary?: string;
  description: string;
  hasJobContent: boolean;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

const stopWords = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'have',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'our',
  'that',
  'the',
  'their',
  'this',
  'to',
  'we',
  'will',
  'with',
  'you',
  'your',
  'role',
  'job',
  'candidate',
  'must',
  'should',
  'required',
  'preferred',
  'essential',
  'desirable',
  'ability',
  'strong',
  'excellent',
  'good',
]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];
}

function line(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' · ');
}

function records(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.flatMap(records);
  if (!value || typeof value !== 'object') return [];
  const current = value as Record<string, unknown>;
  return [current, ...(Array.isArray(current['@graph']) ? records(current['@graph']) : [])];
}

function firstString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function structuredText(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (Array.isArray(value))
    return value.map(structuredText).filter(Boolean).join('\n') || undefined;
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Record<string, unknown>;
  const direct = firstString(item.name) ?? firstString(item.text) ?? firstString(item.description);
  if (direct) return direct;
  const nestedValue = structuredText(item.value);
  if (nestedValue) {
    const currency = firstString(item.currency);
    return currency ? `${currency} ${nestedValue}` : nestedValue;
  }
  const amount = [structuredText(item.minValue), structuredText(item.maxValue)]
    .filter(Boolean)
    .join('–');
  const unit = firstString(item.unitText);
  return amount ? [amount, unit].filter(Boolean).join(' ') : undefined;
}

function structuredJobPosting(value: unknown): Record<string, unknown> | undefined {
  return records(value).find((record) => {
    const type = record['@type'];
    return type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'));
  });
}

function postingCompany(posting?: Record<string, unknown>): string | undefined {
  const hiringOrganization = posting?.hiringOrganization;
  if (!hiringOrganization || typeof hiringOrganization !== 'object') return undefined;
  return firstString((hiringOrganization as Record<string, unknown>).name);
}

function postingLocation(posting?: Record<string, unknown>): string | undefined {
  const locations = Array.isArray(posting?.jobLocation)
    ? posting.jobLocation
    : [posting?.jobLocation];
  for (const location of locations) {
    if (!location || typeof location !== 'object') continue;
    const address = (location as Record<string, unknown>).address;
    if (!address || typeof address !== 'object') continue;
    const details = address as Record<string, unknown>;
    const result = [details.addressLocality, details.addressRegion, details.addressCountry]
      .map(firstString)
      .filter(Boolean)
      .join(', ');
    if (result) return result;
  }
  return undefined;
}

const jobSectionLabels: Array<[RegExp, string]> = [
  [
    /^(?:job description|job summary|the role|about (?:the|this) role|about this position|role overview)$/i,
    'Description',
  ],
  [
    /^(?:responsibilities|key responsibilities|what you(?:'|’)ll do|what you will do|your responsibilities)$/i,
    'Responsibilities',
  ],
  [
    /^(?:requirements|minimum requirements|what you(?:'|’)ll need|what we(?:'|’)re looking for|what we are looking for)$/i,
    'Requirements',
  ],
  [
    /^(?:qualifications|minimum qualifications|preferred qualifications|your qualifications)$/i,
    'Qualifications',
  ],
  [/^(?:preferred skills|skills|technical skills|required skills)$/i, 'Skills'],
  [
    /^(?:experience|required experience|professional experience|experience requirements)$/i,
    'Experience',
  ],
  [/^(?:education|education requirements)$/i, 'Education'],
  [/^(?:certifications|licenses|licences)$/i, 'Certifications'],
  [/^(?:benefits|what we offer|perks and benefits)$/i, 'Benefits'],
  [/^(?:employment type|work type)$/i, 'Employment Type'],
  [/^(?:location|work location)$/i, 'Location'],
  [/^(?:salary|compensation|pay range)$/i, 'Compensation'],
];

const companySectionHeading =
  /^(?:about (?:us|the company|[a-z0-9&'. -]+)|our company|our mission|our vision|who we are|our story|company overview|life at [a-z0-9&'. -]+)$/i;

function headingLabel(value: string): string | undefined {
  const heading = value
    .trim()
    .replace(/^[#•*-]+\s*/, '')
    .replace(/:$/, '')
    .trim();
  const jobLabel = jobSectionLabels.find(([pattern]) => pattern.test(heading))?.[1];
  if (jobLabel) return jobLabel;
  return companySectionHeading.test(heading) ? 'COMPANY' : undefined;
}

function extractLabeledJobSections(value: string): string[] {
  const lines = cleanJobDescription(value)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const sections: Array<{ label: string; lines: string[] }> = [];
  let current: { label: string; lines: string[] } | undefined;
  for (const item of lines) {
    const label = headingLabel(item);
    if (label) {
      current = label === 'COMPANY' ? undefined : { label, lines: [] };
      if (current) sections.push(current);
      continue;
    }
    if (current) current.lines.push(item);
  }
  return sections
    .filter((section) => section.lines.length)
    .map((section) => `${section.label}\n${section.lines.join('\n')}`);
}

function extractTitleAnchoredContent(value: string, title?: string): string[] {
  if (!title) return [];
  const lines = cleanJobDescription(value)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const titleIndex = lines.findIndex((item) => item.toLowerCase() === title.toLowerCase());
  if (titleIndex < 0) return [];
  const content: string[] = [];
  for (const item of lines.slice(titleIndex + 1)) {
    if (headingLabel(item) === 'COMPANY') break;
    content.push(item);
  }
  const result = content.join('\n').trim();
  return result &&
    /\b(responsibilit|requirement|qualif|experience|skill|degree|education|develop|manage|lead|build|design|support|deliver|years?)\b/i.test(
      result,
    )
    ? [result]
    : [];
}

function postingMetadata(posting: Record<string, unknown> | undefined): string[] {
  if (!posting) return [];
  const fields: Array<[string, unknown]> = [
    ['Responsibilities', posting.responsibilities],
    ['Requirements', posting.qualifications],
    ['Skills', posting.skills],
    ['Experience', posting.experienceRequirements],
    ['Education', posting.educationRequirements],
    ['Certifications', posting.certifications],
    ['Benefits', posting.jobBenefits],
    ['Employment Type', posting.employmentType],
    ['Work Mode', posting.jobLocationType],
    ['Compensation', posting.baseSalary],
  ];
  return fields.flatMap(([label, value]) => {
    const text = structuredText(value);
    return text ? [`${label}\n${cleanJobDescription(text)}`] : [];
  });
}

export function extractJobComparisonContent(
  input: JobComparisonContentInput,
): JobComparisonContent {
  const posting = structuredJobPosting(input.structuredData);
  const pageTitle = firstString(input.pageTitle)
    ?.split(/\s+[|–—-]\s+/)[0]
    ?.trim();
  const title = firstString(posting?.title) ?? pageTitle;
  const company = postingCompany(posting);
  const location = postingLocation(posting);
  const employmentType = structuredText(posting?.employmentType);
  const workMode = firstString(posting?.jobLocationType);
  const salary = structuredText(posting?.baseSalary);

  const postingDescription = firstString(posting?.description);
  const pageText = input.pageText ?? '';
  const selectedText = input.selectedText ?? '';
  const plainText = postingDescription
    ? extractLabeledJobSections(postingDescription).join('\n\n') ||
      cleanJobDescription(postingDescription)
    : '';
  const structuredSections = postingMetadata(posting);
  const pageSections = extractLabeledJobSections(pageText);
  const selectedSections = pageSections.length ? [] : extractLabeledJobSections(selectedText);
  const pageFallback =
    pageSections.length || selectedSections.length
      ? []
      : extractTitleAnchoredContent(pageText || selectedText, title);
  const jobText = plainText
    ? [plainText, ...structuredSections].join('\n\n')
    : structuredSections.length
      ? structuredSections.join('\n\n')
      : [...(pageSections.length ? pageSections : selectedSections), ...pageFallback].join('\n\n');

  const metadata = [
    title ? `Job Title\n${title}` : '',
    company ? `Company\n${company}` : '',
    location ? `Location\n${location}` : '',
    employmentType ? `Employment Type\n${employmentType}` : '',
    workMode ? `Work Mode\n${workMode}` : '',
    salary ? `Compensation\n${cleanJobDescription(salary)}` : '',
  ].filter(Boolean);
  const description = [...metadata, jobText].filter(Boolean).join('\n\n').slice(0, 100_000);
  const hasJobContent = Boolean(jobText.trim());

  return {
    ...(title ? { title } : {}),
    ...(company ? { company } : {}),
    ...(location ? { location } : {}),
    ...(employmentType ? { employmentType } : {}),
    ...(workMode ? { workMode } : {}),
    ...(salary ? { salary } : {}),
    description,
    hasJobContent,
    confidence:
      posting && postingDescription && cleanJobDescription(postingDescription).length >= 120
        ? 'HIGH'
        : hasJobContent && jobText.length >= 80
          ? 'MEDIUM'
          : 'LOW',
  };
}

export function structuredCvToText(value: unknown): string {
  const data = record(value) as StructuredCvData;
  const output: string[] = [];
  const personal = data.personal ?? {};

  if (personal.name) output.push(personal.name.toUpperCase());
  if (personal.headline) output.push(personal.headline);
  const contact = line(personal.email, personal.phone, personal.location);
  if (contact) output.push(contact);
  if (personal.links?.length) output.push(personal.links.join(' · '));

  if (data.summary?.trim()) output.push('', 'PROFILE', data.summary.trim());

  if (data.experience?.length) {
    output.push('', 'EXPERIENCE');
    for (const item of data.experience) {
      const heading = line(item.role, item.company);
      if (heading) output.push(heading);
      const meta = line(
        item.location,
        [item.startDate, item.endDate].filter(Boolean).join(' – ') || undefined,
      );
      if (meta) output.push(meta);
      for (const bullet of item.bullets ?? []) if (bullet.trim()) output.push(`• ${bullet.trim()}`);
      output.push('');
    }
  }

  if (data.education?.length) {
    output.push('EDUCATION');
    for (const item of data.education) {
      const heading = line(item.qualification, item.institution);
      if (heading) output.push(heading);
      const meta = line(
        item.location,
        [item.startDate, item.endDate].filter(Boolean).join(' – ') || undefined,
      );
      if (meta) output.push(meta);
      for (const detail of item.details ?? []) if (detail.trim()) output.push(`• ${detail.trim()}`);
      output.push('');
    }
  }

  if (data.skills?.length) output.push('SKILLS', data.skills.join(' · '), '');
  if (data.certifications?.length)
    output.push('CERTIFICATIONS', ...data.certifications.map((item) => `• ${item}`), '');
  if (data.projects?.length) {
    output.push('PROJECTS');
    for (const project of data.projects) {
      if (project.name) output.push(project.name);
      if (project.description) output.push(project.description);
      for (const bullet of project.bullets ?? []) output.push(`• ${bullet}`);
      output.push('');
    }
  }
  if (data.languages?.length) output.push('LANGUAGES', data.languages.join(' · '), '');
  for (const section of data.additional ?? []) {
    if (!section.title || !section.items?.length) continue;
    output.push(section.title.toUpperCase(), ...section.items.map((item) => `• ${item}`), '');
  }

  return output
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function cleanJobDescription(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(?:br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|h[1-6]|li|ul|ol|table|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
      const named: Record<string, string> = {
        amp: '&',
        apos: "'",
        gt: '>',
        lt: '<',
        nbsp: ' ',
        quot: '"',
        ndash: '–',
        mdash: '—',
        rsquo: '’',
        lsquo: '‘',
        rdquo: '”',
        ldquo: '“',
      };
      if (name.startsWith('#x')) {
        const point = Number.parseInt(name.slice(2), 16);
        return Number.isFinite(point) && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
      }
      if (name.startsWith('#')) {
        const point = Number.parseInt(name.slice(1), 10);
        return Number.isFinite(point) && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
      }
      return named[name.toLowerCase()] ?? entity;
    })
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeRequirementKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#. ]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !stopWords.has(token))
    .join(' ')
    .trim();
}

function requirementKind(value: string): CvRequirementKind {
  const lower = value.toLowerCase();
  if (/\b(must|required|essential|minimum|mandatory|need to|shall)\b/.test(lower))
    return CvRequirementKind.REQUIRED;
  if (/\b(preferred|desirable|advantage|ideally|nice to have|bonus)\b/.test(lower))
    return CvRequirementKind.PREFERRED;
  if (/\b(skill|proficien|knowledge|familiar|experience with|ability to|competenc)\b/.test(lower))
    return CvRequirementKind.SKILL;
  return CvRequirementKind.OTHER;
}

function priority(kind: CvRequirementKind): number {
  if (kind === CvRequirementKind.REQUIRED) return 100;
  if (kind === CvRequirementKind.PREFERRED) return 70;
  if (kind === CvRequirementKind.SKILL) return 60;
  return 40;
}

export function extractRequirementsFromDescription(description: string): ExtractedRequirement[] {
  const cleaned = cleanJobDescription(description);
  if (!cleaned) return [];

  const comparisonText = cleaned.replace(
    /(?:^|\n)(?:job title|company|location|employment type|work mode|compensation)\n[^\n]*/gi,
    '\n',
  );
  const rawCandidates = comparisonText
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((item) => item.replace(/^[•*\-–—\d.)\s]+/, '').trim())
    .filter(
      (item) =>
        item.length >= 12 &&
        item.length <= 360 &&
        !/^(?:job title|company|location|employment type|work mode|compensation|description|responsibilities|requirements|qualifications|skills|experience|education|certifications|benefits)$/i.test(
          item,
        ),
    );

  const signal =
    /\b(require|required|must|essential|preferred|desirable|experience|degree|qualification|certif|license|skill|knowledge|proficien|familiar|years?|ability|responsibil|teach|develop|manage|lead|curriculum|assessment|software|technology)\b/i;
  let candidates = rawCandidates.filter((item) => signal.test(item));
  if (candidates.length < 4) candidates = rawCandidates.slice(0, 18);

  const unique = new Map<string, ExtractedRequirement>();
  for (const text of candidates.slice(0, 32)) {
    const normalizedKey = normalizeRequirementKey(text);
    if (!normalizedKey || normalizedKey.length < 3) continue;
    const kind = requirementKind(text);
    const dedupeKey = normalizedKey.split(' ').slice(0, 12).join(' ');
    if (!unique.has(dedupeKey))
      unique.set(dedupeKey, { kind, text, normalizedKey, priority: priority(kind) });
  }
  return [...unique.values()].slice(0, 24);
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeRequirementKey(value).split(' ').filter(Boolean));
}

function evidenceLine(cvText: string, tokens: Set<string>): string | undefined {
  const lines = cvText
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
  let best: { line: string; score: number } | null = null;
  for (const current of lines) {
    const currentTokens = tokenSet(current);
    const hits = [...tokens].filter((token) => currentTokens.has(token)).length;
    const score = tokens.size ? hits / tokens.size : 0;
    if (!best || score > best.score) best = { line: current, score };
  }
  return best && best.score >= 0.22 ? best.line.slice(0, 320) : undefined;
}

export function compareRequirementToCv(
  cvText: string,
  requirementText: string,
): RequirementMatchResult {
  const requirementTokens = tokenSet(requirementText);
  if (!requirementTokens.size) return { status: CvMatchStatus.NOT_APPLICABLE };
  const cvTokens = tokenSet(cvText);
  const hits = [...requirementTokens].filter((token) => cvTokens.has(token)).length;
  const coverage = hits / requirementTokens.size;
  const evidence = evidenceLine(cvText, requirementTokens);
  const lower = requirementText.toLowerCase();
  const confirmationSensitive =
    /\b(degree|bachelor|master|phd|certif|license|qts|pgce|years? of experience|work permit|visa|qualified|qualification)\b/.test(
      lower,
    );

  if (
    coverage >= 0.72 ||
    normalizeRequirementKey(cvText).includes(normalizeRequirementKey(requirementText))
  ) {
    return { status: CvMatchStatus.EVIDENCED, ...(evidence ? { evidence } : {}) };
  }
  if (coverage >= 0.38) {
    return {
      status: CvMatchStatus.PARTIAL,
      ...(evidence ? { evidence } : {}),
      suggestion:
        'Relevant evidence appears in the CV, but it could be made more explicit for this requirement.',
    };
  }
  if (confirmationSensitive) {
    return {
      status: CvMatchStatus.NEEDS_CONFIRMATION,
      suggestion:
        'This requirement is not clearly evidenced. Confirm whether you have it before adding anything to the CV.',
    };
  }
  return {
    status: CvMatchStatus.NOT_EVIDENCED,
    suggestion:
      'This requirement is not evidenced in the current CV. Add it only if it is factually true.',
  };
}

export function scoreRequirementMatches(
  items: Array<{ status: CvMatchStatus; priority: number }>,
): {
  score: number;
  evidenced: number;
  partial: number;
  notEvidenced: number;
  needsConfirmation: number;
} {
  let earned = 0;
  let possible = 0;
  let evidenced = 0;
  let partial = 0;
  let notEvidenced = 0;
  let needsConfirmation = 0;

  for (const item of items) {
    if (item.status === CvMatchStatus.NOT_APPLICABLE) continue;
    const weight = Math.max(1, item.priority);
    possible += weight;
    if (item.status === CvMatchStatus.EVIDENCED) {
      earned += weight;
      evidenced += 1;
    }
    if (item.status === CvMatchStatus.PARTIAL) {
      earned += weight * 0.55;
      partial += 1;
    }
    if (item.status === CvMatchStatus.NEEDS_CONFIRMATION) {
      earned += weight * 0.15;
      needsConfirmation += 1;
    }
    if (item.status === CvMatchStatus.NOT_EVIDENCED) notEvidenced += 1;
  }

  return {
    score: possible ? Math.round((earned / possible) * 100) : 0,
    evidenced,
    partial,
    notEvidenced,
    needsConfirmation,
  };
}

export function plainTextPreviewTitle(text: string): string {
  return (
    text
      .split(/\n+/)
      .map((line) => line.trim())
      .find(Boolean)
      ?.slice(0, 120) || 'CV'
  );
}

export function stringArray(value: unknown): string[] {
  return strings(value);
}
