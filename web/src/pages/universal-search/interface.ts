import type { SearchProfileSummary, SourceSummary } from '../../types/jobs';
import type { Page } from '../../types/navigation';

/** Fields from an individual candidate returned by the web-search API. */
export interface SearchResult {
  title?: string;
  link?: string;
  url?: string;
  snippet?: string;
  domain?: string;
  ingestion?: {
    status: string;
    result?: {
      jobId: string;
      listingId: string;
      newJob: boolean;
      newListing: boolean;
      updatedListing: boolean;
      duplicate: boolean;
      confidence: number;
    };
    reasons?: string[];
    errorMessage?: string;
  };
}

export interface IngestionSummary {
  newJobs?: number;
  duplicates?: number;
  quarantined?: number;
  newListings?: number;
  updatedListings?: number;
}

/** Search API response used by the web-search tab and its result summary. */
export interface SearchResponse {
  query: string;
  results: SearchResult[];
  domains: string[];
  knownSources: Array<{ id: string; name: string; baseUrl?: string }>;
  ingestion:
    | IngestionSummary
    | Array<{ status?: string; jobId?: string; sourceUrl?: string; message?: string }>;
}

/** Email-ingestion record shown in the email alerts tab. */
export interface EmailItem {
  id: string;
  subject?: string | null;
  sender?: string | null;
  receivedAt: string;
  processedAt?: string | null;
  freshness: string;
  jobCount: number;
  recentFolderAssigned?: boolean;
  oldFolderAssigned?: boolean;
  source?: { id: string; name: string } | null;
}

/** Saved group of sources that can be run together. */
export interface Batch {
  id: string;
  name: string;
  description?: string | null;
  items: Array<{ id: string; enabled: boolean; source: SourceSummary }>;
}

export type Tab = 'web' | 'email' | 'batches' | 'browser';

export interface UniversalSearchProps {
  activeProfileId: string;
  profiles: SearchProfileSummary[];
  onNavigate: (page: Page) => void;
}

/** Shared state returned by the discovery loading hook. */
export interface DiscoveryData {
  emails: EmailItem[];
  batches: Batch[];
  sources: SourceSummary[];
  loading: boolean;
  refresh: () => Promise<void>;
}
