import type { NextFunction, Request, Response } from 'express';

import { BadRequestError, UnauthorizedError } from '../../shared/http/http-error.js';
import { analyzeJobSchema } from './ai.schemas.js';
import { aiService } from './ai.service.js';

function userId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !value) {
    throw new BadRequestError(`Route parameter "${name}" is required.`);
  }
  return value;
}

export const aiController = {
  async analyzeJob(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = analyzeJobSchema.parse(req.body);
      res.status(200).json(await aiService.analyzeJob(userId(req), routeParam(req, 'jobId'), profileId));
    } catch (error) { next(error); }
  },
  async extractEmail(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await aiService.extractEmail(userId(req), routeParam(req, 'emailId'))); } catch (error) { next(error); }
  },
  async reviewSource(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ review: await aiService.reviewSource(userId(req), routeParam(req, 'sourceId')) }); } catch (error) { next(error); }
  },
};
