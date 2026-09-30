import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import { createSourceBatchSchema, updateSourceBatchSchema } from './source-batch.schemas.js';
import { sourceBatchService } from './source-batch.service.js';

function userId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

export const sourceBatchController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ batches: await sourceBatchService.list(userId(req)) }); } catch (error) { next(error); }
  },
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createSourceBatchSchema.parse(req.body);
      res.status(201).json({ batch: await sourceBatchService.create(userId(req), input) });
    } catch (error) { next(error); }
  },
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateSourceBatchSchema.parse(req.body);
      res.status(200).json({ batch: await sourceBatchService.update(userId(req), req.params.batchId, input) });
    } catch (error) { next(error); }
  },
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { await sourceBatchService.remove(userId(req), req.params.batchId); res.status(204).end(); } catch (error) { next(error); }
  },
  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(202).json(await sourceBatchService.run(userId(req), req.params.batchId)); } catch (error) { next(error); }
  },
};
