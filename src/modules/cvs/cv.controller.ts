import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import {
  compareCvSchema,
  createCvSchema,
  createTailoringSessionSchema,
  downloadCvSchema,
  linkCvProfileSchema,
  saveTailoredCvSchema,
  updateCvSchema,
  updateTailoringSessionSchema,
  updateTailoringSuggestionSchema,
  uploadCvSchema,
} from './cv.schemas.js';
import { cvService } from './cv.service.js';

function userId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

export const cvController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ cvs: await cvService.list(userId(req), typeof req.query.profileId === 'string' ? req.query.profileId : undefined) }); }
    catch (error) { next(error); }
  },
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ cv: await cvService.get(userId(req), req.params.cvId) }); }
    catch (error) { next(error); }
  },
  async getVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ version: await cvService.getVersion(userId(req), req.params.versionId) }); }
    catch (error) { next(error); }
  },
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ cv: await cvService.create(userId(req), createCvSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ cv: await cvService.upload(userId(req), uploadCvSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ cv: await cvService.update(userId(req), req.params.cvId, updateCvSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async linkProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = linkCvProfileSchema.parse(req.body);
      res.status(200).json({ cv: await cvService.linkProfile(userId(req), req.params.cvId, input.profileId, input.isDefault) });
    } catch (error) { next(error); }
  },
  async matchesForJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ matches: await cvService.matchesForJob(userId(req), req.params.jobId) }); }
    catch (error) { next(error); }
  },
  async compare(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = compareCvSchema.parse(req.body);
      res.status(200).json({ match: await cvService.compare(userId(req), req.params.jobId, input.cvVersionId, input.refreshRequirements) });
    } catch (error) { next(error); }
  },
  async createTailoring(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ session: await cvService.createTailoringSession(userId(req), createTailoringSessionSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async getTailoring(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ session: await cvService.getTailoringSession(userId(req), req.params.sessionId) }); }
    catch (error) { next(error); }
  },
  async updateTailoring(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateTailoringSessionSchema.parse(req.body);
      res.status(200).json({ session: await cvService.updateTailoringSession(userId(req), req.params.sessionId, input.workingText) });
    } catch (error) { next(error); }
  },
  async updateSuggestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ suggestion: await cvService.updateSuggestion(userId(req), req.params.suggestionId, updateTailoringSuggestionSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async saveTailored(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = saveTailoredCvSchema.parse(req.body);
      res.status(201).json({ version: await cvService.saveTailoredVersion(userId(req), req.params.sessionId, input.label) });
    } catch (error) { next(error); }
  },
  async downloadSourceTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = await cvService.downloadSourceTemplate(userId(req), req.params.versionId);
      res.setHeader('content-type', file.contentType);
      res.setHeader('content-disposition', `attachment; filename="${file.fileName.replace(/"/g, '')}"`);
      res.status(200).send(file.buffer);
    } catch (error) { next(error); }
  },
  async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { format } = downloadCvSchema.parse(req.query);
      const file = await cvService.download(userId(req), req.params.versionId, format);
      res.setHeader('content-type', file.contentType);
      res.setHeader('content-disposition', `attachment; filename="${file.fileName}"`);
      res.status(200).send(file.buffer);
    } catch (error) { next(error); }
  },
};
