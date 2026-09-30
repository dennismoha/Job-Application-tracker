import { Router } from 'express';

import { requireUser } from '../auth/auth.middleware.js';
import { aiController } from './ai.controller.js';

export const aiRouter = Router();
aiRouter.use(requireUser);
aiRouter.post('/jobs/:jobId/analyze', aiController.analyzeJob);
aiRouter.post('/email-ingestions/:emailId/extract', aiController.extractEmail);
aiRouter.post('/sources/:sourceId/review', aiController.reviewSource);
