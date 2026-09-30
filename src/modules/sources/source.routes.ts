import { Router } from 'express';

import { requireUser } from '../auth/auth.middleware.js';
import { sourceController } from './source.controller.js';

export const sourceRouter = Router();

sourceRouter.use(requireUser);
sourceRouter.post('/analyze', sourceController.analyze);
sourceRouter.post('/verify', sourceController.verify);
sourceRouter.post('/resolve', sourceController.resolve);
sourceRouter.get('/', sourceController.list);
sourceRouter.post('/', sourceController.create);
sourceRouter.get('/:sourceId/workspace', sourceController.workspace);
sourceRouter.get('/:sourceId', sourceController.get);
sourceRouter.patch('/:sourceId', sourceController.update);
sourceRouter.delete('/:sourceId', sourceController.remove);
sourceRouter.post('/:sourceId/audit', sourceController.audit);
