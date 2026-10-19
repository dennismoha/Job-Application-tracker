import { env } from '../../config/env.js';
import { jobLifecycleService } from '../jobs/job-lifecycle.service.js';
import { acquisitionRunService } from './acquisition-run.service.js';
import { sourceScheduleService } from './source-schedule.service.js';
import { crawlerConfigService } from './crawler-config.service.js';
import { processCvAssetDeletions } from '../cvs/cv-asset-deletion.service.js';

let schedulerTimer: NodeJS.Timeout | undefined;
let workerTimer: NodeJS.Timeout | undefined;
let cvAssetDeletionTimer: NodeJS.Timeout | undefined;
let workerBusy = false;

async function schedulerTick(): Promise<void> {
  try {
    const staleBefore = new Date(Date.now() - env.RUN_STALE_MINUTES * 60_000);
    await acquisitionRunService.recoverStaleRuns(staleBefore);
    await sourceScheduleService.queueDueSchedules();
    await crawlerConfigService.queueDue();
    await jobLifecycleService.expireKnownDates();
  } catch (error) {
    console.error('Scheduler tick failed.', error);
  }
}

async function workerTick(): Promise<void> {
  if (workerBusy) return;

  workerBusy = true;

  try {
    const run = await acquisitionRunService.claimNext(env.WORKER_ID);

    if (run) {
      await acquisitionRunService.executeClaimedRun(run.id);
    }
  } catch (error) {
    console.error('Acquisition worker tick failed.', error);
  } finally {
    workerBusy = false;
  }
}

export function startSchedulerRuntime(): void {
  void processCvAssetDeletions().catch((error) => {
    console.error('CV asset cleanup tick failed.', error);
  });
  cvAssetDeletionTimer = setInterval(() => {
    void processCvAssetDeletions().catch((error) => {
      console.error('CV asset cleanup tick failed.', error);
    });
  }, env.WORKER_TICK_MS);

  if (!env.SCHEDULER_ENABLED) return;

  void schedulerTick();
  void workerTick();

  schedulerTimer = setInterval(() => void schedulerTick(), env.SCHEDULER_TICK_MS);
  workerTimer = setInterval(() => void workerTick(), env.WORKER_TICK_MS);
}

export function stopSchedulerRuntime(): void {
  if (schedulerTimer) clearInterval(schedulerTimer);
  if (workerTimer) clearInterval(workerTimer);
  if (cvAssetDeletionTimer) clearInterval(cvAssetDeletionTimer);
}
