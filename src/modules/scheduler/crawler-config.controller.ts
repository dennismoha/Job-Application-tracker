import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import { crawlerConfigService } from './crawler-config.service.js';
import { crawlerConfigInputSchema, crawlerConfigUpdateSchema, pauseScheduleSchema } from './scheduler.schemas.js';

function userId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

export const crawlerConfigController = {
  async listAll(this: void, req: Request, res: Response, next: NextFunction) { try { res.status(200).json({ configs: await crawlerConfigService.listAll(userId(req)) }); } catch (error) { next(error); } },
  async list(this: void, req: Request, res: Response, next: NextFunction) { try { res.status(200).json({ configs: await crawlerConfigService.listForSource(req.params.sourceId, userId(req)) }); } catch (error) { next(error); } },
  async create(this: void, req: Request, res: Response, next: NextFunction) { try { res.status(201).json({ config: await crawlerConfigService.create(req.params.sourceId, userId(req), crawlerConfigInputSchema.parse(req.body)) }); } catch (error) { next(error); } },
  async update(this: void, req: Request, res: Response, next: NextFunction) { try { res.status(200).json({ config: await crawlerConfigService.update(req.params.configId, userId(req), crawlerConfigUpdateSchema.parse(req.body)) }); } catch (error) { next(error); } },
  async pause(this: void, req: Request, res: Response, next: NextFunction) { try { const { minutes } = pauseScheduleSchema.parse(req.body); res.status(200).json({ config: await crawlerConfigService.pause(req.params.configId, userId(req), minutes) }); } catch (error) { next(error); } },
  async resume(this: void, req: Request, res: Response, next: NextFunction) { try { res.status(200).json({ config: await crawlerConfigService.resume(req.params.configId, userId(req)) }); } catch (error) { next(error); } },
  async run(this: void, req: Request, res: Response, next: NextFunction) { try { res.status(202).json({ run: await crawlerConfigService.queue(req.params.configId, userId(req)) }); } catch (error) { next(error); } },
  async remove(this: void, req: Request, res: Response, next: NextFunction) { try { await crawlerConfigService.remove(req.params.configId, userId(req)); res.status(204).send(); } catch (error) { next(error); } },
};
