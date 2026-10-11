import type { NextFunction, Request, Response } from 'express';

import { BadRequestError, UnauthorizedError } from '../../shared/http/http-error.js';
import { createSourceSchema } from '../sources/source.schemas.js';
import { sourceService } from '../sources/source.service.js';
import { browserCompanionService } from './browser-companion.service.js';
import {
  analyzeCompactBrowserPageSchema,
  browserContextSchema,
  captureJobSchema,
  compareBrowserPageSchema,
  createBrowserTokenSchema,
  prepareBrowserCvSchema,
} from './browser-companion.schemas.js';

function userId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

export const browserCompanionController = {
  async listTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ tokens: await browserCompanionService.listTokens(userId(req)) });
    } catch (error) {
      next(error);
    }
  },
  async createToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(201).json({
        token: await browserCompanionService.createToken(
          userId(req),
          createBrowserTokenSchema.parse(req.body),
        ),
      });
    } catch (error) {
      next(error);
    }
  },
  async revokeToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await browserCompanionService.revokeToken(userId(req), req.params.tokenId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  async createSource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createSourceSchema.parse(req.body);
      res.status(201).json({ source: await sourceService.create(userId(req), input) });
    } catch (error) {
      next(error);
    }
  },
  async listSources(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = typeof req.query.url === 'string' ? req.query.url : '';
      if (!url) throw new Error('A page URL is required.');
      res.status(200).json(await browserCompanionService.sourcesForUrl(url));
    } catch (error) {
      next(error);
    }
  },
  async listCvs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        cvs: await browserCompanionService.listCvs(
          userId(req),
          typeof req.query.profileId === 'string' ? req.query.profileId : undefined,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
  async analyzePage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = analyzeCompactBrowserPageSchema.safeParse(req.body);
      if (!parsed.success) {
        const details = parsed.error.issues
          .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
          .join('; ');
        throw new BadRequestError(`Analyze-page request validation failed: ${details}`);
      }

      console.log('analyzePage called with body:', parsed.data);

      const data = await browserCompanionService.analyzePage(userId(req), parsed.data);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },
  async comparePage(req: Request, res: Response, next: NextFunction): Promise<void> {
    console.log('comparePage called with body:', req.body);
    console.log('comparePage called with query:', compareBrowserPageSchema.parse(req.body));
    res.json(
      await browserCompanionService.comparePage(
        userId(req),
        compareBrowserPageSchema.parse(req.body),
      ),
    );

    // try { res.status(200).json(await browserCompanionService.comparePage(userId(req), compareCompactBrowserPageSchema.parse(req.body))); }
    // catch (error) { next(error); }
  },
  async prepareCv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res
        .status(201)
        .json(
          await browserCompanionService.prepareCv(
            userId(req),
            prepareBrowserCvSchema.parse(req.body),
          ),
        );
    } catch (error) {
      next(error);
    }
  },
  async context(req: Request, res: Response, next: NextFunction): Promise<void> {
    console.log('==============> context called with query:', req.query);

    try {
      res
        .status(200)
        .json(
          await browserCompanionService.context(
            userId(req),
            browserContextSchema.parse(req.query).url,
          ),
        );
    } catch (error) {
      console.error('Error in context:', error);
      next(error);
    }
  },
  async capture(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res
        .status(201)
        .json(await browserCompanionService.capture(userId(req), captureJobSchema.parse(req.body)));
    } catch (error) {
      next(error);
    }
  },
};
