import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import {
  createApplicationEventSchema,
  createApplicationNoteSchema,
  createApplicationSchema,
  listApplicationsSchema,
  updateApplicationAttributionSchema,
  updateApplicationStageSchema,
} from './application.schemas.js';
import { applicationService } from './application.service.js';

function userId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

export const applicationController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await applicationService.list(userId(req), listApplicationsSchema.parse(req.query))); }
    catch (error) { next(error); }
  },
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ application: await applicationService.get(userId(req), req.params.applicationId) }); }
    catch (error) { next(error); }
  },
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ application: await applicationService.create(userId(req), createApplicationSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async updateAttribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateApplicationAttributionSchema.parse(req.body);
      res.status(200).json({ application: await applicationService.updateAttribution(userId(req), req.params.applicationId, input) });
    } catch (error) { next(error); }
  },
  async updateStage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ application: await applicationService.updateStage(userId(req), req.params.applicationId, updateApplicationStageSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async addEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ application: await applicationService.addEvent(userId(req), req.params.applicationId, createApplicationEventSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await applicationService.remove(userId(req), req.params.applicationId)); } catch (error) { next(error); }
  },

  async addNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { note } = createApplicationNoteSchema.parse(req.body);
      res.status(201).json({ note: await applicationService.addNote(userId(req), req.params.applicationId, note) });
    } catch (error) { next(error); }
  },
};
