import type { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import {
  analyzeSourceSchema,
  createSourceSchema,
  listSourcesQuerySchema,
  updateSourceSchema,
  resolveSourceSchema,
  verifySourceSchema,
} from './source.schemas.js';
import { sourceAuditService } from './source-audit.service.js';
import { sourceService } from './source.service.js';

function currentUserId(req: Request): string {
  if (!req.currentUser) {
    throw new UnauthorizedError();
  }

  return req.currentUser.id;
}

export const sourceController = {
  async verify(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { url } = verifySourceSchema.parse(req.body);
      res.status(200).json({ verification: await sourceService.verifyUrl(url) });
    } catch (error) { next(error); }
  },
  async resolve(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { url } = resolveSourceSchema.parse(req.body);
      const result = await sourceService.resolveByUrl(url);
      res.status(200).json({ ...result, unclassified: result.matched ? null : await sourceService.ensureUnclassifiedSource() });
    } catch (error) { next(error); }
  },
  async list(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listSourcesQuerySchema.parse(req.query);
      const where: Prisma.SourceWhereInput = {
        ...(query.collectionCapability ? { collectionCapability: query.collectionCapability } : {}),
        ...(query.sourceType ? { sourceType: query.sourceType } : {}),
        ...(query.active === undefined ? {} : { active: query.active }),
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { baseUrl: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      res.status(200).json({ sources: await sourceService.list(where) });
    } catch (error) {
      next(error);
    }
  },

  async get(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ source: await sourceService.get(req.params.sourceId) });
    } catch (error) {
      next(error);
    }
  },

  async workspace(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await sourceService.workspace(req.params.sourceId, currentUserId(req))); } catch (error) { next(error); }
  },

  async analyze(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { url } = analyzeSourceSchema.parse(req.body);
      res.status(200).json({ analysis: await sourceAuditService.analyze(url) });
    } catch (error) {
      next(error);
    }
  },

  async create(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createSourceSchema.parse(req.body);
      const source = await sourceService.create(currentUserId(req), input);
      res.status(201).json({ source });
    } catch (error) {
      next(error);
    }
  },

  async update(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateSourceSchema.parse(req.body);
      res.status(200).json({
        source: await sourceService.update(req.params.sourceId, currentUserId(req), input),
      });
    } catch (error) {
      next(error);
    }
  },


  async remove(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json(await sourceService.remove(req.params.sourceId, currentUserId(req)));
    } catch (error) {
      next(error);
    }
  },

  async audit(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(201).json(await sourceService.audit(req.params.sourceId, currentUserId(req)));
    } catch (error) {
      next(error);
    }
  },
};
