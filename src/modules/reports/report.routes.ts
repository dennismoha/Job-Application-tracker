import { Router } from 'express';

import { requireUser } from '../auth/auth.middleware.js';
import { reportController } from './report.controller.js';

export const reportRouter = Router();
reportRouter.use(requireUser);
reportRouter.get('/overview', reportController.overview);
reportRouter.get('/sources', reportController.sources);
reportRouter.get('/jobs', reportController.jobs);
reportRouter.get('/applications', reportController.applications);
reportRouter.get('/risk', reportController.risk);
reportRouter.get('/job-search-brain', reportController.brain);
reportRouter.get('/system-health', reportController.health);
