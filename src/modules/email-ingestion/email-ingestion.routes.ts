import { Router } from 'express';

import { requireUser } from '../auth/auth.middleware.js';
import { emailIngestionController } from './email-ingestion.controller.js';

export const emailIngestionRouter = Router();

emailIngestionRouter.post('/webhook', emailIngestionController.webhook);
emailIngestionRouter.get('/', requireUser, emailIngestionController.list);
emailIngestionRouter.post('/:emailId/label-acknowledged', requireUser, emailIngestionController.acknowledgeLabel);
