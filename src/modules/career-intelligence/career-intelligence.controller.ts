import type { NextFunction, Request, Response } from 'express';
import { EvidenceType, FollowUpState } from '@prisma/client';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import {
  assistantFieldSchema,
  campaignCreateSchema,
  campaignUpdateSchema,
  contactCreateSchema,
  contactLinkSchema,
  contactUpdateSchema,
  coverLetterGenerateSchema,
  coverLetterUpdateSchema,
  evidenceCreateSchema,
  evidenceUpdateSchema,
  followUpStateSchema,
  intelligenceQuerySchema,
  interviewUpdateSchema,
  notificationStateSchema,
  offerUpsertSchema,
  packUpdateSchema,
} from './career-intelligence.schemas.js';
import { careerIntelligenceService } from './career-intelligence.service.js';

function userId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !value) throw new Error(`Route parameter "${name}" is required.`);
  return value;
}

export const careerIntelligenceController = {
  async listEvidence(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ evidence: await careerIntelligenceService.listEvidence(userId(req), req.query.type ? EvidenceType[req.query.type as keyof typeof EvidenceType] : undefined) }); } catch (error) { next(error); }
  },
  async createEvidence(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ evidence: await careerIntelligenceService.createEvidence(userId(req), evidenceCreateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async updateEvidence(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ evidence: await careerIntelligenceService.updateEvidence(userId(req), routeParam(req, 'evidenceId'), evidenceUpdateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async deleteEvidence(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await careerIntelligenceService.deleteEvidence(userId(req), routeParam(req, 'evidenceId'))); } catch (error) { next(error); }
  },
  async getPack(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await careerIntelligenceService.getPack(userId(req), routeParam(req, 'applicationId'))); } catch (error) { next(error); }
  },
  async updatePack(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ pack: await careerIntelligenceService.updatePack(userId(req), routeParam(req, 'applicationId'), packUpdateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async captureSnapshot(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ snapshot: await careerIntelligenceService.captureSnapshot(userId(req), routeParam(req, 'applicationId'), req.body?.reason) }); } catch (error) { next(error); }
  },
  async jobHistory(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ history: await careerIntelligenceService.jobHistory(userId(req), routeParam(req, 'jobId')) }); } catch (error) { next(error); }
  },
  async generateCoverLetter(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ coverLetter: await careerIntelligenceService.generateCoverLetter(userId(req), routeParam(req, 'applicationId'), coverLetterGenerateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async updateCoverLetter(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ coverLetter: await careerIntelligenceService.updateCoverLetter(userId(req), routeParam(req, 'coverLetterId'), coverLetterUpdateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async getInterview(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ interview: await careerIntelligenceService.getInterview(userId(req), routeParam(req, 'applicationId')) }); } catch (error) { next(error); }
  },
  async updateInterview(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ interview: await careerIntelligenceService.updateInterview(userId(req), routeParam(req, 'applicationId'), interviewUpdateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async prepareInterview(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ interview: await careerIntelligenceService.generateInterviewPrep(userId(req), routeParam(req, 'applicationId')) }); } catch (error) { next(error); }
  },
  async listContacts(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ contacts: await careerIntelligenceService.listContacts(userId(req)) }); } catch (error) { next(error); }
  },
  async createContact(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ contact: await careerIntelligenceService.createContact(userId(req), contactCreateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async updateContact(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ contact: await careerIntelligenceService.updateContact(userId(req), routeParam(req, 'contactId'), contactUpdateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async deleteContact(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await careerIntelligenceService.deleteContact(userId(req), routeParam(req, 'contactId'))); } catch (error) { next(error); }
  },
  async linkContact(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const input = contactLinkSchema.parse(req.body); res.status(201).json({ link: await careerIntelligenceService.linkContact(userId(req), routeParam(req, 'applicationId'), input.contactId, input.relationship) }); } catch (error) { next(error); }
  },
  async evaluateFollowUp(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ followUp: await careerIntelligenceService.evaluateFollowUp(userId(req), routeParam(req, 'applicationId')) }); } catch (error) { next(error); }
  },
  async listFollowUps(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ followUps: await careerIntelligenceService.listFollowUps(userId(req), req.query.state ? FollowUpState[req.query.state as keyof typeof FollowUpState] : undefined) }); } catch (error) { next(error); }
  },
  async updateFollowUp(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const input = followUpStateSchema.parse(req.body); res.status(200).json({ followUp: await careerIntelligenceService.updateFollowUp(userId(req), routeParam(req, 'followUpId'), input.state) }); } catch (error) { next(error); }
  },
  async upsertOffer(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ offer: await careerIntelligenceService.upsertOffer(userId(req), routeParam(req, 'applicationId'), offerUpsertSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async compareOffers(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ offers: await careerIntelligenceService.compareOffers(userId(req)) }); } catch (error) { next(error); }
  },
  async skillGaps(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const input = intelligenceQuerySchema.parse(req.query); res.status(200).json(await careerIntelligenceService.skillGaps(userId(req), input.profileId, input.days)); } catch (error) { next(error); }
  },
  async market(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const input = intelligenceQuerySchema.parse(req.query); res.status(200).json(await careerIntelligenceService.market(userId(req), input.profileId, input.days)); } catch (error) { next(error); }
  },
  async strategy(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const input = intelligenceQuerySchema.parse(req.query); res.status(200).json(await careerIntelligenceService.strategy(userId(req), input.profileId, input.days)); } catch (error) { next(error); }
  },
  async priorities(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ priorities: await careerIntelligenceService.priorities(userId(req), typeof req.query.profileId === 'string' ? req.query.profileId : undefined) }); } catch (error) { next(error); }
  },
  async listCampaigns(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ campaigns: await careerIntelligenceService.listCampaigns(userId(req)) }); } catch (error) { next(error); }
  },
  async createCampaign(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ campaign: await careerIntelligenceService.createCampaign(userId(req), campaignCreateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async updateCampaign(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ campaign: await careerIntelligenceService.updateCampaign(userId(req), routeParam(req, 'campaignId'), campaignUpdateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async campaignSummary(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ summary: await careerIntelligenceService.campaignSummary(userId(req), routeParam(req, 'campaignId')) }); } catch (error) { next(error); }
  },
  async refreshNotifications(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ notifications: await careerIntelligenceService.refreshNotifications(userId(req)) }); } catch (error) { next(error); }
  },
  async listNotifications(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ notifications: await careerIntelligenceService.listNotifications(userId(req)) }); } catch (error) { next(error); }
  },
  async updateNotification(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const input = notificationStateSchema.parse(req.body); res.status(200).json({ notification: await careerIntelligenceService.updateNotification(userId(req), routeParam(req, 'notificationId'), input.state) }); } catch (error) { next(error); }
  },
  async assistantField(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const input = assistantFieldSchema.parse(req.body); res.status(200).json({ suggestion: await careerIntelligenceService.assistantField(userId(req), input.applicationId, input.fieldLabel, input.fieldHelp) }); } catch (error) { next(error); }
  },
  async launchApplication(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await careerIntelligenceService.launchApplication(userId(req), routeParam(req, 'applicationId'))); } catch (error) { next(error); }
  },
};
