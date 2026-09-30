import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import { createSourceSchema } from '../sources/source.schemas.js';
import { sourceService } from '../sources/source.service.js';
import { browserCompanionService } from './browser-companion.service.js';
import { analyzeBrowserPageSchema, browserContextSchema, captureJobSchema, compareBrowserPageSchema, createBrowserTokenSchema, prepareBrowserCvSchema } from './browser-companion.schemas.js';

function userId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

export const browserCompanionController = {
  async listTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ tokens: await browserCompanionService.listTokens(userId(req)) }); }
    catch (error) { next(error); }
  },
  async createToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ token: await browserCompanionService.createToken(userId(req), createBrowserTokenSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async revokeToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { await browserCompanionService.revokeToken(userId(req), req.params.tokenId); res.status(204).send(); }
    catch (error) { next(error); }
  },
  async createSource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createSourceSchema.parse(req.body);
      res.status(201).json({ source: await sourceService.create(userId(req), input) });
    } catch (error) { next(error); }
  },
  async listSources(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = typeof req.query.url === 'string' ? req.query.url : '';
      if (!url) throw new Error('A page URL is required.');
      res.status(200).json(await browserCompanionService.sourcesForUrl(url));
    } catch (error) { next(error); }
  },
  async listCvs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ cvs: await browserCompanionService.listCvs(userId(req), typeof req.query.profileId === 'string' ? req.query.profileId : undefined) }); }
    catch (error) { next(error); }
  },
  async analyzePage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await browserCompanionService.analyzePage(userId(req), analyzeBrowserPageSchema.parse(req.body))); }
    catch (error) { next(error); }
  },
  async comparePage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await browserCompanionService.comparePage(userId(req), compareBrowserPageSchema.parse(req.body))); }
    catch (error) { next(error); }
  },
  async prepareCv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json(await browserCompanionService.prepareCv(userId(req), prepareBrowserCvSchema.parse(req.body))); }
    catch (error) { next(error); }
  },
  async context(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await browserCompanionService.context(userId(req), browserContextSchema.parse(req.query).url)); }
    catch (error) { next(error); }
  },
  async capture(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json(await browserCompanionService.capture(userId(req), captureJobSchema.parse(req.body))); }
    catch (error) { next(error); }
  },
};
