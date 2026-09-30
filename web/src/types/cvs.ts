export interface CvProfileLinkSummary {
  id: string;
  profileId: string;
  isDefault: boolean;
  profile?: { id: string; name: string };
}

export interface CvVersionSummary {
  id: string;
  versionNumber: number;
  label?: string | null;
  sourceType: string;
  plainText?: string;
  changeSummary?: string | null;
  createdAt: string;
}

export interface CvSummary {
  id: string;
  name: string;
  description?: string | null;
  isMaster: boolean;
  archived: boolean;
  updatedAt: string;
  versions: CvVersionSummary[];
  profileLinks: CvProfileLinkSummary[];
}

export interface CvMatchItem {
  id?: string;
  requirementText: string;
  status: 'EVIDENCED' | 'PARTIAL' | 'NOT_EVIDENCED' | 'NEEDS_CONFIRMATION' | 'NOT_APPLICABLE';
  evidence?: string | null;
  suggestion?: string | null;
}

export interface CvJobMatch {
  id: string;
  score: number;
  summary?: string | null;
  evidencedCount: number;
  partialCount: number;
  notEvidencedCount: number;
  needsConfirmationCount: number;
  cvVersion: CvVersionSummary & { cv: { id: string; name: string } };
  items: CvMatchItem[];
}

export interface CvTailoringSuggestion {
  id: string;
  requirementText?: string | null;
  section?: string | null;
  beforeText?: string | null;
  afterText?: string | null;
  reason: string;
  requiresConfirmation: boolean;
  confirmedFact?: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'EDITED' | 'IGNORED';
}

export interface CvTailoringSession {
  id: string;
  status: string;
  workingText: string;
  job: { id: string; title: string; company?: { name: string } | null };
  baseCvVersion: CvVersionSummary & { cv: { id: string; name: string } };
  createdVersion?: (CvVersionSummary & { cv: { id: string; name: string } }) | null;
  match?: { id: string; score: number; items: CvMatchItem[] } | null;
  suggestions: CvTailoringSuggestion[];
}
