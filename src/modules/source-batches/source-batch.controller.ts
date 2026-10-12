import type { NextFunction, Request, Response } from 'express';

import { BadRequestError, UnauthorizedError } from '../../shared/http/http-error.js';
import { createSourceBatchSchema, updateSourceBatchSchema } from './source-batch.schemas.js';
import { sourceBatchService } from './source-batch.service.js';

function userId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !value) throw new BadRequestError(`Route parameter "${name}" is required.`);
  return value;
}

export const sourceBatchController = {
  async list(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ batches: await sourceBatchService.list(userId(req)) }); } catch (error) { next(error); }
  },
  async create(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createSourceBatchSchema.parse(req.body);
      res.status(201).json({ batch: await sourceBatchService.create(userId(req), input) });
    } catch (error) { next(error); }
  },
  async update(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateSourceBatchSchema.parse(req.body);
      res.status(200).json({ batch: await sourceBatchService.update(userId(req), routeParam(req, 'batchId'), input) });
    } catch (error) { next(error); }
  },
  async remove(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { await sourceBatchService.remove(userId(req), routeParam(req, 'batchId')); res.status(204).end(); } catch (error) { next(error); }
  },
  async run(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(202).json(await sourceBatchService.run(userId(req), routeParam(req, 'batchId'))); } catch (error) { next(error); }
  },
};
