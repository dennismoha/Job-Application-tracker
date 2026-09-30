import { Router } from 'express';

import { requireUser } from '../auth/auth.middleware.js';
import { applicationController } from './application.controller.js';

export const applicationRouter = Router();
applicationRouter.use(requireUser);
applicationRouter.get('/', applicationController.list);
applicationRouter.post('/', applicationController.create);
applicationRouter.get('/:applicationId', applicationController.get);
applicationRouter.patch('/:applicationId/stage', applicationController.updateStage);
applicationRouter.patch('/:applicationId/attribution', applicationController.updateAttribution);
applicationRouter.post('/:applicationId/events', applicationController.addEvent);
applicationRouter.post('/:applicationId/notes', applicationController.addNote);

applicationRouter.delete('/:applicationId', applicationController.remove);
