import { timingSafeEqual } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../shared/http/http-error.js';
import { acknowledgeLabelSchema, listEmailIngestionsSchema, receiveEmailSchema } from './email-ingestion.schemas.js';
import { emailIngestionService } from './email-ingestion.service.js';

function validSecret(value: string | undefined): boolean {
  if (!value || !env.N8N_INGESTION_SECRET) return false;
  const received = Buffer.from(value);
  const expected = Buffer.from(env.N8N_INGESTION_SECRET);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export const emailIngestionController = {
  async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!validSecret(req.header('x-ingestion-secret'))) throw new UnauthorizedError('Invalid ingestion secret.');
      const input = receiveEmailSchema.parse(req.body);
      res.status(202).json(await emailIngestionService.receive(input));
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.currentUser) throw new UnauthorizedError();
      const { limit } = listEmailIngestionsSchema.parse(req.query);
      res.status(200).json({ emails: await emailIngestionService.list(req.currentUser.id, limit) });
    } catch (error) {
      next(error);
    }
  },

  async acknowledgeLabel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.currentUser) throw new UnauthorizedError();
      const { label } = acknowledgeLabelSchema.parse(req.body);
      const email = await emailIngestionService.acknowledgeLabel(req.currentUser.id, req.params.emailId, label);
      res.status(200).json({ email });
    } catch (error) {
      next(error);
    }
  },
};
