import { Router } from 'express';

import { requireUser } from '../auth/auth.middleware.js';
import { ingestionController } from './ingestion.controller.js';

export const ingestionRouter = Router();

ingestionRouter.use(requireUser);
ingestionRouter.get('/', ingestionController.list);
