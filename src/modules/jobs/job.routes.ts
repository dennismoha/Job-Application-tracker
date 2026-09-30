import { Router } from 'express';

import { requireUser } from '../auth/auth.middleware.js';
import { jobController } from './job.controller.js';

export const jobRouter = Router();

jobRouter.use(requireUser);
jobRouter.get('/', jobController.list);
jobRouter.post('/share', jobController.share);
jobRouter.post('/check-url', jobController.checkUrl);
jobRouter.post('/manual', jobController.createManual);
jobRouter.get('/:jobId', jobController.get);
jobRouter.patch('/:jobId', jobController.update);
jobRouter.delete('/:jobId', jobController.remove);
jobRouter.patch('/:jobId/state', jobController.updateState);
jobRouter.post('/:jobId/notes', jobController.addNote);
jobRouter.post('/:jobId/listings', jobController.addListing);
jobRouter.patch('/listings/:listingId/source', jobController.changeListingSource);
jobRouter.post('/listings/:listingId/move', jobController.moveListing);
