import { Router } from 'express';

import { requireUser } from '../auth/auth.middleware.js';
import { sourceBatchController } from './source-batch.controller.js';

export const sourceBatchRouter = Router();
sourceBatchRouter.use(requireUser);
sourceBatchRouter.get('/', sourceBatchController.list);
sourceBatchRouter.post('/', sourceBatchController.create);
sourceBatchRouter.patch('/:batchId', sourceBatchController.update);
sourceBatchRouter.delete('/:batchId', sourceBatchController.remove);
sourceBatchRouter.post('/:batchId/run', sourceBatchController.run);
