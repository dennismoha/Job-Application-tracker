import type { NextFunction, Request, Response } from 'express';

import { BadRequestError, UnauthorizedError } from '../../shared/http/http-error.js';
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

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string') {
    throw new BadRequestError(`Missing or invalid route parameter: ${name}`);
  }
  return value;
}

export const cvController = {
  async list(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ cvs: await cvService.list(userId(req), typeof req.query.profileId === 'string' ? req.query.profileId : undefined) }); }
    catch (error) { next(error); }
  },
  async listArchived(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ cvs: await cvService.list(userId(req), typeof req.query.profileId === 'string' ? req.query.profileId : undefined, true) }); }
    catch (error) { next(error); }
  },
  async get(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ cv: await cvService.get(userId(req), routeParam(req, 'cvId')) }); }
    catch (error) { next(error); }
  },
  async getVersion(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ version: await cvService.getVersion(userId(req), routeParam(req, 'versionId')) }); }
    catch (error) { next(error); }
  },
  async create(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ cv: await cvService.create(userId(req), createCvSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async upload(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ cv: await cvService.upload(userId(req), uploadCvSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async update(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ cv: await cvService.update(userId(req), routeParam(req, 'cvId'), updateCvSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async archive(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ cv: await cvService.archive(userId(req), routeParam(req, 'cvId')) }); }
    catch (error) { next(error); }
  },
  async restore(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ cv: await cvService.restore(userId(req), routeParam(req, 'cvId')) }); }
    catch (error) { next(error); }
  },
  async remove(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await cvService.remove(userId(req), routeParam(req, 'cvId'));
      res.status(204).send();
    } catch (error) { next(error); }
  },
  async linkProfile(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = linkCvProfileSchema.parse(req.body);
      res.status(200).json({ cv: await cvService.linkProfile(userId(req), routeParam(req, 'cvId'), input.profileId, input.isDefault) });
    } catch (error) { next(error); }
  },
  async matchesForJob(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ matches: await cvService.matchesForJob(userId(req), routeParam(req, 'jobId')) }); }
    catch (error) { next(error); }
  },
  async compare(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = compareCvSchema.parse(req.body);
      res.status(200).json({ match: await cvService.compare(userId(req), routeParam(req, 'jobId'), input.cvVersionId, input.refreshRequirements) });
    } catch (error) { next(error); }
  },
  async createTailoring(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ session: await cvService.createTailoringSession(userId(req), createTailoringSessionSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async getTailoring(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ session: await cvService.getTailoringSession(userId(req), routeParam(req, 'sessionId')) }); }
    catch (error) { next(error); }
  },
  async updateTailoring(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateTailoringSessionSchema.parse(req.body);
      res.status(200).json({ session: await cvService.updateTailoringSession(userId(req), routeParam(req, 'sessionId'), input.workingText) });
    } catch (error) { next(error); }
  },
  async updateSuggestion(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ suggestion: await cvService.updateSuggestion(userId(req), routeParam(req, 'suggestionId'), updateTailoringSuggestionSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async saveTailored(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = saveTailoredCvSchema.parse(req.body);
      res.status(201).json({ version: await cvService.saveTailoredVersion(userId(req), routeParam(req, 'sessionId'), input.label) });
    } catch (error) { next(error); }
  },
  async downloadSourceTemplate(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = await cvService.downloadSourceTemplate(userId(req), routeParam(req, 'versionId'));
      res.setHeader('content-type', file.contentType);
      res.setHeader('content-disposition', `attachment; filename="${file.fileName.replace(/"/g, '')}"`);
      res.status(200).send(file.buffer);
    } catch (error) { next(error); }
  },
  async download(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { format } = downloadCvSchema.parse(req.query);
      const file = await cvService.download(userId(req), routeParam(req, 'versionId'), format);
      res.setHeader('content-type', file.contentType);
      res.setHeader('content-disposition', `attachment; filename="${file.fileName}"`);
      res.status(200).send(file.buffer);
    } catch (error) { next(error); }
  },
};
