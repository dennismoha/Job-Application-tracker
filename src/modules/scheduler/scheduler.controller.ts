import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import { acquisitionRunService } from './acquisition-run.service.js';
import { listRunsQuerySchema, pauseScheduleSchema, updateScheduleSchema } from './scheduler.schemas.js';
import { sourceScheduleService } from './source-schedule.service.js';


function userId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

export const schedulerController = {
  async getSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        schedule: await sourceScheduleService.get(req.params.sourceId, userId(req)),
      });
    } catch (error) {
      next(error);
    }
  },

  async updateSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateScheduleSchema.parse(req.body);
      res.status(200).json({
        schedule: await sourceScheduleService.update(req.params.sourceId, userId(req), input),
      });
    } catch (error) {
      next(error);
    }
  },

  async pause(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { minutes } = pauseScheduleSchema.parse(req.body);
      res.status(200).json({
        schedule: await sourceScheduleService.pause(req.params.sourceId, userId(req), minutes),
      });
    } catch (error) {
      next(error);
    }
  },

  async resume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        schedule: await sourceScheduleService.resume(req.params.sourceId, userId(req)),
      });
    } catch (error) {
      next(error);
    }
  },

  async runNow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(202).json({
        run: await acquisitionRunService.queueSourceRun(req.params.sourceId, userId(req)),
      });
    } catch (error) {
      next(error);
    }
  },

  async getRun(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ run: await acquisitionRunService.getDetail(req.params.runId, userId(req)) }); } catch (error) { next(error); }
  },

  async listRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = listRunsQuerySchema.parse(req.query);
      res.status(200).json({ runs: await acquisitionRunService.list(userId(req), input) });
    } catch (error) {
      next(error);
    }
  },
};
