import { Router } from 'express';

import { requireUser } from '../auth/auth.middleware.js';
import { schedulerController } from './scheduler.controller.js';
import { crawlerConfigController } from './crawler-config.controller.js';

export const schedulerRouter = Router();

schedulerRouter.use(requireUser);
schedulerRouter.get('/runs', schedulerController.listRuns);
schedulerRouter.get('/runs/:runId', schedulerController.getRun);
schedulerRouter.get('/sources/:sourceId/schedule', schedulerController.getSchedule);
schedulerRouter.patch('/sources/:sourceId/schedule', schedulerController.updateSchedule);
schedulerRouter.post('/sources/:sourceId/pause', schedulerController.pause);
schedulerRouter.post('/sources/:sourceId/resume', schedulerController.resume);
schedulerRouter.post('/sources/:sourceId/run', schedulerController.runNow);

schedulerRouter.get('/configs', crawlerConfigController.listAll);
schedulerRouter.get('/sources/:sourceId/configs', crawlerConfigController.list);
schedulerRouter.post('/sources/:sourceId/configs', crawlerConfigController.create);
schedulerRouter.patch('/configs/:configId', crawlerConfigController.update);
schedulerRouter.post('/configs/:configId/pause', crawlerConfigController.pause);
schedulerRouter.post('/configs/:configId/resume', crawlerConfigController.resume);
schedulerRouter.post('/configs/:configId/run', crawlerConfigController.run);
schedulerRouter.delete('/configs/:configId', crawlerConfigController.remove);
