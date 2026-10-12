import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import { reportFiltersSchema } from './report.schemas.js';
import { reportService } from './report.service.js';

function userId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

export const reportController = {
  async overview(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await reportService.overview(userId(req), reportFiltersSchema.parse(req.query))); } catch (error) { next(error); }
  },
  async sources(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ sources: await reportService.sources(userId(req), reportFiltersSchema.parse(req.query)) }); } catch (error) { next(error); }
  },
  async jobs(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ jobs: await reportService.jobs(userId(req), reportFiltersSchema.parse(req.query)) }); } catch (error) { next(error); }
  },
  async applications(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await reportService.applications(userId(req), reportFiltersSchema.parse(req.query))); } catch (error) { next(error); }
  },
  async risk(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await reportService.risk(userId(req), reportFiltersSchema.parse(req.query))); } catch (error) { next(error); }
  },
  async brain(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await reportService.brain(userId(req), reportFiltersSchema.parse(req.query))); } catch (error) { next(error); }
  },
  async health(this: void, _req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await reportService.systemHealth()); } catch (error) { next(error); }
  },
};
