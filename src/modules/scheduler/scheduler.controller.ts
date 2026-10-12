import type { NextFunction, Request, Response } from 'express';

import { BadRequestError, UnauthorizedError } from '../../shared/http/http-error.js';
import { acquisitionRunService } from './acquisition-run.service.js';
import { listRunsQuerySchema, pauseScheduleSchema, updateScheduleSchema } from './scheduler.schemas.js';
import { sourceScheduleService } from './source-schedule.service.js';


function userId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !value) throw new BadRequestError(`Route parameter "${name}" is required.`);
  return value;
}

export const schedulerController = {
  async getSchedule(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        schedule: await sourceScheduleService.get(routeParam(req, 'sourceId'), userId(req)),
      });
    } catch (error) {
      next(error);
    }
  },

  async updateSchedule(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateScheduleSchema.parse(req.body);
      res.status(200).json({
        schedule: await sourceScheduleService.update(routeParam(req, 'sourceId'), userId(req), input),
      });
    } catch (error) {
      next(error);
    }
  },

  async pause(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { minutes } = pauseScheduleSchema.parse(req.body);
      res.status(200).json({
        schedule: await sourceScheduleService.pause(routeParam(req, 'sourceId'), userId(req), minutes),
      });
    } catch (error) {
      next(error);
    }
  },

  async resume(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        schedule: await sourceScheduleService.resume(routeParam(req, 'sourceId'), userId(req)),
      });
    } catch (error) {
      next(error);
    }
  },

  async runNow(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(202).json({
        run: await acquisitionRunService.queueSourceRun(routeParam(req, 'sourceId'), userId(req)),
      });
    } catch (error) {
      next(error);
    }
  },

  async getRun(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ run: await acquisitionRunService.getDetail(routeParam(req, 'runId'), userId(req)) }); } catch (error) { next(error); }
  },

  async listRuns(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = listRunsQuerySchema.parse(req.query);
      res.status(200).json({ runs: await acquisitionRunService.list(userId(req), input) });
    } catch (error) {
      next(error);
    }
  },
};
