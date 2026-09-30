import { Router } from 'express';

import { requireUser } from '../auth/auth.middleware.js';
import { cvController } from './cv.controller.js';

export const cvRouter = Router();
cvRouter.use(requireUser);

cvRouter.get('/', cvController.list);
cvRouter.post('/', cvController.create);
cvRouter.post('/upload', cvController.upload);
cvRouter.get('/versions/:versionId', cvController.getVersion);
cvRouter.get('/versions/:versionId/download', cvController.download);
cvRouter.get('/versions/:versionId/source-template', cvController.downloadSourceTemplate);
cvRouter.get('/jobs/:jobId/matches', cvController.matchesForJob);
cvRouter.post('/jobs/:jobId/compare', cvController.compare);
cvRouter.post('/tailoring', cvController.createTailoring);
cvRouter.get('/tailoring/:sessionId', cvController.getTailoring);
cvRouter.patch('/tailoring/:sessionId', cvController.updateTailoring);
cvRouter.post('/tailoring/:sessionId/save', cvController.saveTailored);
cvRouter.patch('/tailoring/suggestions/:suggestionId', cvController.updateSuggestion);
cvRouter.get('/:cvId', cvController.get);
cvRouter.patch('/:cvId', cvController.update);
cvRouter.post('/:cvId/profile-links', cvController.linkProfile);
