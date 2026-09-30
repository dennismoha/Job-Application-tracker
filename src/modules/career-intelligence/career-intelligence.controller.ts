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

export const careerIntelligenceController = {
  async listEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ evidence: await careerIntelligenceService.listEvidence(userId(req), req.query.type ? EvidenceType[req.query.type as keyof typeof EvidenceType] : undefined) }); } catch (error) { next(error); }
  },
  async createEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ evidence: await careerIntelligenceService.createEvidence(userId(req), evidenceCreateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async updateEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ evidence: await careerIntelligenceService.updateEvidence(userId(req), req.params.evidenceId, evidenceUpdateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async deleteEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await careerIntelligenceService.deleteEvidence(userId(req), req.params.evidenceId)); } catch (error) { next(error); }
  },
  async getPack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await careerIntelligenceService.getPack(userId(req), req.params.applicationId)); } catch (error) { next(error); }
  },
  async updatePack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ pack: await careerIntelligenceService.updatePack(userId(req), req.params.applicationId, packUpdateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async captureSnapshot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ snapshot: await careerIntelligenceService.captureSnapshot(userId(req), req.params.applicationId, req.body?.reason) }); } catch (error) { next(error); }
  },
  async jobHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ history: await careerIntelligenceService.jobHistory(userId(req), req.params.jobId) }); } catch (error) { next(error); }
  },
  async generateCoverLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ coverLetter: await careerIntelligenceService.generateCoverLetter(userId(req), req.params.applicationId, coverLetterGenerateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async updateCoverLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ coverLetter: await careerIntelligenceService.updateCoverLetter(userId(req), req.params.coverLetterId, coverLetterUpdateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async getInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ interview: await careerIntelligenceService.getInterview(userId(req), req.params.applicationId) }); } catch (error) { next(error); }
  },
  async updateInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ interview: await careerIntelligenceService.updateInterview(userId(req), req.params.applicationId, interviewUpdateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async prepareInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ interview: await careerIntelligenceService.generateInterviewPrep(userId(req), req.params.applicationId) }); } catch (error) { next(error); }
  },
  async listContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ contacts: await careerIntelligenceService.listContacts(userId(req)) }); } catch (error) { next(error); }
  },
  async createContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ contact: await careerIntelligenceService.createContact(userId(req), contactCreateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async updateContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ contact: await careerIntelligenceService.updateContact(userId(req), req.params.contactId, contactUpdateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async deleteContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await careerIntelligenceService.deleteContact(userId(req), req.params.contactId)); } catch (error) { next(error); }
  },
  async linkContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const input = contactLinkSchema.parse(req.body); res.status(201).json({ link: await careerIntelligenceService.linkContact(userId(req), req.params.applicationId, input.contactId, input.relationship) }); } catch (error) { next(error); }
  },
  async evaluateFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ followUp: await careerIntelligenceService.evaluateFollowUp(userId(req), req.params.applicationId) }); } catch (error) { next(error); }
  },
  async listFollowUps(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ followUps: await careerIntelligenceService.listFollowUps(userId(req), req.query.state ? FollowUpState[req.query.state as keyof typeof FollowUpState] : undefined) }); } catch (error) { next(error); }
  },
  async updateFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const input = followUpStateSchema.parse(req.body); res.status(200).json({ followUp: await careerIntelligenceService.updateFollowUp(userId(req), req.params.followUpId, input.state) }); } catch (error) { next(error); }
  },
  async upsertOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ offer: await careerIntelligenceService.upsertOffer(userId(req), req.params.applicationId, offerUpsertSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async compareOffers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ offers: await careerIntelligenceService.compareOffers(userId(req)) }); } catch (error) { next(error); }
  },
  async skillGaps(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const input = intelligenceQuerySchema.parse(req.query); res.status(200).json(await careerIntelligenceService.skillGaps(userId(req), input.profileId, input.days)); } catch (error) { next(error); }
  },
  async market(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const input = intelligenceQuerySchema.parse(req.query); res.status(200).json(await careerIntelligenceService.market(userId(req), input.profileId, input.days)); } catch (error) { next(error); }
  },
  async strategy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const input = intelligenceQuerySchema.parse(req.query); res.status(200).json(await careerIntelligenceService.strategy(userId(req), input.profileId, input.days)); } catch (error) { next(error); }
  },
  async priorities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ priorities: await careerIntelligenceService.priorities(userId(req), typeof req.query.profileId === 'string' ? req.query.profileId : undefined) }); } catch (error) { next(error); }
  },
  async listCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ campaigns: await careerIntelligenceService.listCampaigns(userId(req)) }); } catch (error) { next(error); }
  },
  async createCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ campaign: await careerIntelligenceService.createCampaign(userId(req), campaignCreateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async updateCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ campaign: await careerIntelligenceService.updateCampaign(userId(req), req.params.campaignId, campaignUpdateSchema.parse(req.body)) }); } catch (error) { next(error); }
  },
  async campaignSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ summary: await careerIntelligenceService.campaignSummary(userId(req), req.params.campaignId) }); } catch (error) { next(error); }
  },
  async refreshNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ notifications: await careerIntelligenceService.refreshNotifications(userId(req)) }); } catch (error) { next(error); }
  },
  async listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ notifications: await careerIntelligenceService.listNotifications(userId(req)) }); } catch (error) { next(error); }
  },
  async updateNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const input = notificationStateSchema.parse(req.body); res.status(200).json({ notification: await careerIntelligenceService.updateNotification(userId(req), req.params.notificationId, input.state) }); } catch (error) { next(error); }
  },
  async assistantField(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const input = assistantFieldSchema.parse(req.body); res.status(200).json({ suggestion: await careerIntelligenceService.assistantField(userId(req), input.applicationId, input.fieldLabel, input.fieldHelp) }); } catch (error) { next(error); }
  },
  async launchApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await careerIntelligenceService.launchApplication(userId(req), req.params.applicationId)); } catch (error) { next(error); }
  },
};
