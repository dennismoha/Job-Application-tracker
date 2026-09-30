import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import { createRiskReportSchema, listRiskReportsSchema } from './risk.schemas.js';
import { riskService } from './risk.service.js';

function userId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

export const riskController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ reports: await riskService.list(userId(req), listRiskReportsSchema.parse(req.query)) }); }
    catch (error) { next(error); }
  },
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ report: await riskService.create(userId(req), createRiskReportSchema.parse(req.body)) }); }
    catch (error) { next(error); }
  },
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { await riskService.remove(userId(req), req.params.reportId); res.status(204).end(); } catch (error) { next(error); }
  },
};
