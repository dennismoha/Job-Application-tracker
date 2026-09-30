import { createApp } from './app.js';
import { env } from './config/env.js';
import { startSchedulerRuntime, stopSchedulerRuntime } from './modules/scheduler/scheduler-runtime.js';
import { logger } from './shared/logging/logger.js';
import { prisma } from './shared/prisma/prisma-client.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info('api_started', { port: env.PORT });
  startSchedulerRuntime();
});

async function shutdown(signal: string): Promise<void> {
  logger.info('api_stopping', { signal });
  stopSchedulerRuntime();

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
