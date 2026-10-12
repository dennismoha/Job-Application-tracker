import type { NextFunction, Request, Response } from 'express';

import { BadRequestError, UnauthorizedError } from '../../shared/http/http-error.js';
import { crawlerConfigService } from './crawler-config.service.js';
import { crawlerConfigInputSchema, crawlerConfigUpdateSchema, pauseScheduleSchema } from './scheduler.schemas.js';

function userId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !value) throw new BadRequestError(`Route parameter "${name}" is required.`);
  return value;
}

export const crawlerConfigController = {
  async listAll(this: void, req: Request, res: Response, next: NextFunction) { try { res.status(200).json({ configs: await crawlerConfigService.listAll(userId(req)) }); } catch (error) { next(error); } },
  async list(this: void, req: Request, res: Response, next: NextFunction) { try { res.status(200).json({ configs: await crawlerConfigService.listForSource(routeParam(req, 'sourceId'), userId(req)) }); } catch (error) { next(error); } },
  async create(this: void, req: Request, res: Response, next: NextFunction) { try { res.status(201).json({ config: await crawlerConfigService.create(routeParam(req, 'sourceId'), userId(req), crawlerConfigInputSchema.parse(req.body)) }); } catch (error) { next(error); } },
  async update(this: void, req: Request, res: Response, next: NextFunction) { try { res.status(200).json({ config: await crawlerConfigService.update(routeParam(req, 'configId'), userId(req), crawlerConfigUpdateSchema.parse(req.body)) }); } catch (error) { next(error); } },
  async pause(this: void, req: Request, res: Response, next: NextFunction) { try { const { minutes } = pauseScheduleSchema.parse(req.body); res.status(200).json({ config: await crawlerConfigService.pause(routeParam(req, 'configId'), userId(req), minutes) }); } catch (error) { next(error); } },
  async resume(this: void, req: Request, res: Response, next: NextFunction) { try { res.status(200).json({ config: await crawlerConfigService.resume(routeParam(req, 'configId'), userId(req)) }); } catch (error) { next(error); } },
  async run(this: void, req: Request, res: Response, next: NextFunction) { try { res.status(202).json({ run: await crawlerConfigService.queue(routeParam(req, 'configId'), userId(req)) }); } catch (error) { next(error); } },
  async remove(this: void, req: Request, res: Response, next: NextFunction) { try { await crawlerConfigService.remove(routeParam(req, 'configId'), userId(req)); res.status(204).send(); } catch (error) { next(error); } },
};
