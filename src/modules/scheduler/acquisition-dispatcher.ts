import { CollectionCapability, RunStatus, RunType, type Source } from '@prisma/client';

import { SourceCollectorExecutor } from '../acquisition/collectors/source-collector.executor.js';
import { SearchSourceExecutor } from '../search/search.executor.js';

export interface AcquisitionExecutionContext {
  runId: string;
  crawlerConfig?: {
    id: string;
    name: string;
    keywords: string[];
    locations: string[];
    categories: string[];
    subjects: string[];
    maximumPages: number;
    maximumRequests: number;
    requestDelayMs: number;
  };
}

export interface AcquisitionExecutionResult {
  status: RunStatus;
  httpStatus?: number | undefined;
  pagesRequested?: number | undefined;
  listingsFound?: number | undefined;
  newListings?: number | undefined;
  updatedListings?: number | undefined;
  unchangedListings?: number | undefined;
  newJobs?: number | undefined;
  duplicates?: number | undefined;
  quarantined?: number | undefined;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface AcquisitionExecutor {
  supports(source: Source, runType: RunType): boolean;
  execute(
    source: Source,
    runType: RunType,
    context: AcquisitionExecutionContext,
  ): Promise<AcquisitionExecutionResult>;
}

export class AcquisitionDispatcher {
  constructor(
    private readonly executors: AcquisitionExecutor[] = [
      new SearchSourceExecutor(),
      new SourceCollectorExecutor(),
    ],
  ) {}

  async dispatch(source: Source, runType: RunType, context: AcquisitionExecutionContext): Promise<AcquisitionExecutionResult> {
    if (
      source.collectionCapability === CollectionCapability.EMAIL_ONLY ||
      source.collectionCapability === CollectionCapability.RESTRICTED ||
      source.collectionCapability === CollectionCapability.DISABLED
    ) {
      return {
        status: RunStatus.SKIPPED,
        errorCode: 'NON_NETWORK_SOURCE_MODE',
        errorMessage: `${source.collectionCapability} sources are not automatically crawled.`,
      };
    }

    const executor = this.executors.find((candidate) => candidate.supports(source, runType));

    if (!executor) {
      return {
        status: RunStatus.FAILED,
        errorCode: 'NO_EXECUTOR',
        errorMessage: `No acquisition executor supports ${source.name}.`,
      };
    }

    return executor.execute(source, runType, context);
  }
}
