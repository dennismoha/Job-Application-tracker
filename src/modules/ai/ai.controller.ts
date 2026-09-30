import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import { analyzeJobSchema } from './ai.schemas.js';
import { aiService } from './ai.service.js';

function userId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

export const aiController = {
  async analyzeJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = analyzeJobSchema.parse(req.body);
      res.status(200).json(await aiService.analyzeJob(userId(req), req.params.jobId, profileId));
    } catch (error) { next(error); }
  },
  async extractEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await aiService.extractEmail(userId(req), req.params.emailId)); } catch (error) { next(error); }
  },
  async reviewSource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ review: await aiService.reviewSource(userId(req), req.params.sourceId) }); } catch (error) { next(error); }
  },
};
