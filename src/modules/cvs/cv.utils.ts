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

const stopWords = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'have', 'in', 'is', 'it', 'of', 'on', 'or',
  'our', 'that', 'the', 'their', 'this', 'to', 'we', 'will', 'with', 'you', 'your', 'role', 'job', 'candidate',
  'must', 'should', 'required', 'preferred', 'essential', 'desirable', 'ability', 'strong', 'excellent', 'good',
]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : [];
}

function line(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' · ');
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
      const meta = line(item.location, [item.startDate, item.endDate].filter(Boolean).join(' – ') || undefined);
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
      const meta = line(item.location, [item.startDate, item.endDate].filter(Boolean).join(' – ') || undefined);
      if (meta) output.push(meta);
      for (const detail of item.details ?? []) if (detail.trim()) output.push(`• ${detail.trim()}`);
      output.push('');
    }
  }

  if (data.skills?.length) output.push('SKILLS', data.skills.join(' · '), '');
  if (data.certifications?.length) output.push('CERTIFICATIONS', ...data.certifications.map((item) => `• ${item}`), '');
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

  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function cleanJobDescription(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
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
  if (/\b(must|required|essential|minimum|mandatory|need to|shall)\b/.test(lower)) return CvRequirementKind.REQUIRED;
  if (/\b(preferred|desirable|advantage|ideally|nice to have|bonus)\b/.test(lower)) return CvRequirementKind.PREFERRED;
  if (/\b(skill|proficien|knowledge|familiar|experience with|ability to|competenc)\b/.test(lower)) return CvRequirementKind.SKILL;
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

  const rawCandidates = cleaned
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((item) => item.replace(/^[•*\-–—\d.)\s]+/, '').trim())
    .filter((item) => item.length >= 12 && item.length <= 360);

  const signal = /\b(require|required|must|essential|preferred|desirable|experience|degree|qualification|certif|license|skill|knowledge|proficien|familiar|years?|ability|responsibil|teach|develop|manage|lead|curriculum|assessment|software|technology)\b/i;
  let candidates = rawCandidates.filter((item) => signal.test(item));
  if (candidates.length < 4) candidates = rawCandidates.slice(0, 18);

  const unique = new Map<string, ExtractedRequirement>();
  for (const text of candidates.slice(0, 32)) {
    const normalizedKey = normalizeRequirementKey(text);
    if (!normalizedKey || normalizedKey.length < 3) continue;
    const kind = requirementKind(text);
    const dedupeKey = normalizedKey.split(' ').slice(0, 12).join(' ');
    if (!unique.has(dedupeKey)) unique.set(dedupeKey, { kind, text, normalizedKey, priority: priority(kind) });
  }
  return [...unique.values()].slice(0, 24);
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeRequirementKey(value).split(' ').filter(Boolean));
}

function evidenceLine(cvText: string, tokens: Set<string>): string | undefined {
  const lines = cvText.split(/\n+/).map((item) => item.trim()).filter(Boolean);
  let best: { line: string; score: number } | null = null;
  for (const current of lines) {
    const currentTokens = tokenSet(current);
    const hits = [...tokens].filter((token) => currentTokens.has(token)).length;
    const score = tokens.size ? hits / tokens.size : 0;
    if (!best || score > best.score) best = { line: current, score };
  }
  return best && best.score >= 0.22 ? best.line.slice(0, 320) : undefined;
}

export function compareRequirementToCv(cvText: string, requirementText: string): RequirementMatchResult {
  const requirementTokens = tokenSet(requirementText);
  if (!requirementTokens.size) return { status: CvMatchStatus.NOT_APPLICABLE };
  const cvTokens = tokenSet(cvText);
  const hits = [...requirementTokens].filter((token) => cvTokens.has(token)).length;
  const coverage = hits / requirementTokens.size;
  const evidence = evidenceLine(cvText, requirementTokens);
  const lower = requirementText.toLowerCase();
  const confirmationSensitive = /\b(degree|bachelor|master|phd|certif|license|qts|pgce|years? of experience|work permit|visa|qualified|qualification)\b/.test(lower);

  if (coverage >= 0.72 || normalizeRequirementKey(cvText).includes(normalizeRequirementKey(requirementText))) {
    return { status: CvMatchStatus.EVIDENCED, evidence };
  }
  if (coverage >= 0.38) {
    return {
      status: CvMatchStatus.PARTIAL,
      evidence,
      suggestion: 'Relevant evidence appears in the CV, but it could be made more explicit for this requirement.',
    };
  }
  if (confirmationSensitive) {
    return {
      status: CvMatchStatus.NEEDS_CONFIRMATION,
      suggestion: 'This requirement is not clearly evidenced. Confirm whether you have it before adding anything to the CV.',
    };
  }
  return {
    status: CvMatchStatus.NOT_EVIDENCED,
    suggestion: 'This requirement is not evidenced in the current CV. Add it only if it is factually true.',
  };
}

export function scoreRequirementMatches(
  items: Array<{ status: CvMatchStatus; priority: number }>,
): { score: number; evidenced: number; partial: number; notEvidenced: number; needsConfirmation: number } {
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
    if (item.status === CvMatchStatus.EVIDENCED) { earned += weight; evidenced += 1; }
    if (item.status === CvMatchStatus.PARTIAL) { earned += weight * 0.55; partial += 1; }
    if (item.status === CvMatchStatus.NEEDS_CONFIRMATION) { earned += weight * 0.15; needsConfirmation += 1; }
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
  return text.split(/\n+/).map((line) => line.trim()).find(Boolean)?.slice(0, 120) || 'CV';
}

export function stringArray(value: unknown): string[] {
  return strings(value);
}
