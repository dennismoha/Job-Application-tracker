import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { aiRouter } from './modules/ai/ai.routes.js';
import { applicationRouter } from './modules/applications/application.routes.js';
import { browserCompanionRouter } from './modules/browser-companion/browser-companion.routes.js';
import { careerIntelligenceRouter } from './modules/career-intelligence/career-intelligence.routes.js';
import { cvRouter } from './modules/cvs/cv.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { emailIngestionRouter } from './modules/email-ingestion/email-ingestion.routes.js';
import { ingestionRouter } from './modules/ingestion/ingestion.routes.js';
import { jobRouter } from './modules/jobs/job.routes.js';
import { profileRouter } from './modules/profiles/profile.routes.js';
import { reportRouter } from './modules/reports/report.routes.js';
import { riskRouter } from './modules/risk/risk.routes.js';
import { schedulerRouter } from './modules/scheduler/scheduler.routes.js';
import { searchRouter } from './modules/search/search.routes.js';
import { sourceBatchRouter } from './modules/source-batches/source-batch.routes.js';
import { sourceRouter } from './modules/sources/source.routes.js';
import { apiRateLimit } from './shared/http/rate-limit.js';
import { errorHandler } from './shared/http/error-handler.js';
import { notFoundHandler } from './shared/http/not-found.js';
import { requestContext } from './shared/http/request-context.js';
import { requestLogger } from './shared/http/request-logger.js';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  // app.use(
  //   cors({
  //     origin(origin, callback) {
  //       const allowed = env.CORS_ORIGIN.split(',').map((item) => item.trim());
  //       const isBrowserExtension = origin?.startsWith('chrome-extension://') || origin?.startsWith('moz-extension://');
  //       callback(null, !origin || allowed.includes(origin) || Boolean(isBrowserExtension));
  //     },
  //     credentials: true,
  //   }),
  // );

  app.use(
    cors({
      origin(origin, callback) {
        const allowed = env.CORS_ORIGIN.split(',').map((item) => item.trim());

        const isBrowserExtension =
          origin?.startsWith('chrome-extension://') ||
          origin?.startsWith('moz-extension://');

        callback(
          null,
          !origin || allowed.includes(origin) || Boolean(isBrowserExtension),
        );
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '12mb' }));
  app.use(requestContext);
  app.use(requestLogger);
  app.use(apiRateLimit);

  app.get('/', (_req, res) => {
    res.status(200).json({
      name: 'Job Intelligence Platform API',
      version: '1.8.0',
    });
  });

  app.use('/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/applications', applicationRouter);
  app.use('/api/browser-companion', browserCompanionRouter);
  app.use('/api/career', careerIntelligenceRouter);
  app.use('/api/cvs', cvRouter);
  app.use('/api/profiles', profileRouter);
  app.use('/api/jobs', jobRouter);
  app.use('/api/email-ingestions', emailIngestionRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/source-batches', sourceBatchRouter);
  app.use('/api/risk', riskRouter);
  app.use('/api/reports', reportRouter);
  app.use('/api/ingestions', ingestionRouter);
  app.use('/api/sources', sourceRouter);
  app.use('/api/scheduler', schedulerRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
