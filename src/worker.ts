import { env } from './config/env.js';
import { startSchedulerRuntime, stopSchedulerRuntime } from './modules/scheduler/scheduler-runtime.js';
import { logger } from './shared/logging/logger.js';
import { prisma } from './shared/prisma/prisma-client.js';

if (!env.SCHEDULER_ENABLED) {
  logger.warn('worker_started_with_scheduler_disabled');
}

startSchedulerRuntime();
logger.info('acquisition_worker_started', { workerId: env.WORKER_ID });

async function shutdown(signal: string): Promise<void> {
  logger.info('acquisition_worker_stopping', { signal });
  stopSchedulerRuntime();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

// Keep the standalone worker process alive while scheduler timers are active.
setInterval(() => undefined, 60_000).unref();
