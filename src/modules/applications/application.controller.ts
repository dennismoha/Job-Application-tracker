import type { NextFunction, Request, Response } from 'express';

import { BadRequestError, UnauthorizedError } from '../../shared/http/http-error.js';
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

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !value) {
    throw new BadRequestError(`Route parameter "${name}" is required.`);
  }
  return value;
}

export const applicationController = {
  async list(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await applicationService.list(userId(req), listApplicationsSchema.parse(req.query))); }
    catch (error) { next(error); }
  },
  async get(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ application: await applicationService.get(userId(req), routeParam(req, 'applicationId')) }); }
    catch (error) { next(error); }
  },
  async create(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ application: await applicationService.create(userId(req), createApplicationSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async updateAttribution(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateApplicationAttributionSchema.parse(req.body);
      res.status(200).json({ application: await applicationService.updateAttribution(userId(req), routeParam(req, 'applicationId'), input) });
    } catch (error) { next(error); }
  },
  async updateStage(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ application: await applicationService.updateStage(userId(req), routeParam(req, 'applicationId'), updateApplicationStageSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async addEvent(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ application: await applicationService.addEvent(userId(req), routeParam(req, 'applicationId'), createApplicationEventSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async remove(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await applicationService.remove(userId(req), routeParam(req, 'applicationId'))); } catch (error) { next(error); }
  },

  async addNote(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { note } = createApplicationNoteSchema.parse(req.body);
      res.status(201).json({ note: await applicationService.addNote(userId(req), routeParam(req, 'applicationId'), note) });
    } catch (error) { next(error); }
  },
};
