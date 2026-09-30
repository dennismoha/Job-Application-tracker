import { CollectionCapability, RunStatus, RunType, SourceAccessState, SourceType, RiskLevel } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
  AcquisitionDispatcher,
  type AcquisitionExecutor,
} from '../src/modules/scheduler/acquisition-dispatcher.js';

const source = {
  id: 'source-1',
  name: 'Test Source',
  slug: 'test-source',
  sourceType: SourceType.COMPANY_CAREERS,
  collectionCapability: CollectionCapability.CRAWLABLE,
  accessState: SourceAccessState.OPEN,
  baseUrl: 'https://example.com',
  careersUrl: 'https://example.com/careers',
  companyId: null,
  createdByUserId: null,
  requiresLogin: false,
  antiBotObserved: false,
  emailAlertsAvailable: false,
  emailAlertsUrl: null,
  accountUrl: null,
  defaultIntervalMinutes: 1440,
  minimumRequestDelayMs: 2000,
  maxRequestsPerRun: 20,
  systemRiskLevel: RiskLevel.UNKNOWN,
  lastAuditedAt: null,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('acquisition dispatcher', () => {
  it('can execute an injected collector without coupling the scheduler to crawler code', async () => {
    const executor: AcquisitionExecutor = {
      supports: () => true,
      execute: async () => ({ status: RunStatus.COMPLETED, listingsFound: 3 }),
    };

    const result = await new AcquisitionDispatcher([executor]).dispatch(source, RunType.SCHEDULED_CRAWL, { runId: 'run-1' });

    expect(result).toMatchObject({ status: RunStatus.COMPLETED, listingsFound: 3 });
  });
});
