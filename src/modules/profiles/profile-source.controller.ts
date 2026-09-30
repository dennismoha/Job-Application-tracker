import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import { upsertSourceSubscriptionSchema } from './profile-source.schemas.js';
import { profileSourceService } from './profile-source.service.js';

function userId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

export const profileSourceController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        subscriptions: await profileSourceService.list(req.params.profileId, userId(req)),
      });
    } catch (error) {
      next(error);
    }
  },

  async upsert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = upsertSourceSubscriptionSchema.parse(req.body);
      const subscription = await profileSourceService.upsert(
        req.params.profileId,
        req.params.sourceId,
        userId(req),
        input,
      );
      res.status(200).json({ subscription });
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await profileSourceService.remove(req.params.profileId, req.params.sourceId, userId(req));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
