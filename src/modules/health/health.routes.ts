import { Router } from 'express';

import { getLiveHealth, getReadyHealth } from './health.controller.js';

export const healthRouter = Router();
healthRouter.get('/', getReadyHealth);
healthRouter.get('/live', getLiveHealth);
healthRouter.get('/ready', getReadyHealth);
