import { Router } from 'express';

import { requireUser } from '../auth/auth.middleware.js';
import { riskController } from './risk.controller.js';

export const riskRouter = Router();
riskRouter.use(requireUser);
riskRouter.get('/', riskController.list);
riskRouter.post('/', riskController.create);
riskRouter.delete('/:reportId', riskController.remove);
