import { Router } from 'express';

import { requireUser } from '../auth/auth.middleware.js';
import { careerIntelligenceController as controller } from './career-intelligence.controller.js';

export const careerIntelligenceRouter = Router();
careerIntelligenceRouter.use(requireUser);

careerIntelligenceRouter.get('/evidence', controller.listEvidence);
careerIntelligenceRouter.post('/evidence', controller.createEvidence);
careerIntelligenceRouter.patch('/evidence/:evidenceId', controller.updateEvidence);
careerIntelligenceRouter.delete('/evidence/:evidenceId', controller.deleteEvidence);

careerIntelligenceRouter.get('/applications/:applicationId/pack', controller.getPack);
careerIntelligenceRouter.patch('/applications/:applicationId/pack', controller.updatePack);
careerIntelligenceRouter.post('/applications/:applicationId/snapshots', controller.captureSnapshot);
careerIntelligenceRouter.post('/applications/:applicationId/cover-letter', controller.generateCoverLetter);
careerIntelligenceRouter.patch('/cover-letters/:coverLetterId', controller.updateCoverLetter);
careerIntelligenceRouter.get('/applications/:applicationId/interview', controller.getInterview);
careerIntelligenceRouter.patch('/applications/:applicationId/interview', controller.updateInterview);
careerIntelligenceRouter.post('/applications/:applicationId/interview/prepare', controller.prepareInterview);
careerIntelligenceRouter.post('/applications/:applicationId/contacts', controller.linkContact);
careerIntelligenceRouter.post('/applications/:applicationId/follow-up/evaluate', controller.evaluateFollowUp);
careerIntelligenceRouter.put('/applications/:applicationId/offer', controller.upsertOffer);
careerIntelligenceRouter.get('/applications/:applicationId/launch', controller.launchApplication);

careerIntelligenceRouter.get('/jobs/:jobId/history', controller.jobHistory);

careerIntelligenceRouter.get('/contacts', controller.listContacts);
careerIntelligenceRouter.post('/contacts', controller.createContact);
careerIntelligenceRouter.patch('/contacts/:contactId', controller.updateContact);
careerIntelligenceRouter.delete('/contacts/:contactId', controller.deleteContact);

careerIntelligenceRouter.get('/follow-ups', controller.listFollowUps);
careerIntelligenceRouter.patch('/follow-ups/:followUpId', controller.updateFollowUp);
careerIntelligenceRouter.get('/offers', controller.compareOffers);

careerIntelligenceRouter.get('/intelligence/skill-gaps', controller.skillGaps);
careerIntelligenceRouter.get('/intelligence/market', controller.market);
careerIntelligenceRouter.get('/intelligence/strategy', controller.strategy);
careerIntelligenceRouter.get('/intelligence/priorities', controller.priorities);

careerIntelligenceRouter.get('/campaigns', controller.listCampaigns);
careerIntelligenceRouter.post('/campaigns', controller.createCampaign);
careerIntelligenceRouter.patch('/campaigns/:campaignId', controller.updateCampaign);
careerIntelligenceRouter.get('/campaigns/:campaignId/summary', controller.campaignSummary);

careerIntelligenceRouter.get('/notifications', controller.listNotifications);
careerIntelligenceRouter.post('/notifications/refresh', controller.refreshNotifications);
careerIntelligenceRouter.patch('/notifications/:notificationId', controller.updateNotification);

careerIntelligenceRouter.post('/assistant/field', controller.assistantField);
