import type { NextFunction, Request, Response } from 'express';

import { BadRequestError, UnauthorizedError } from '../../shared/http/http-error.js';
import { upsertSourceSubscriptionSchema } from './profile-source.schemas.js';
import { profileSourceService } from './profile-source.service.js';

function userId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !value) throw new BadRequestError(`Route parameter "${name}" is required.`);
  return value;
}

export const profileSourceController = {
  async list(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        subscriptions: await profileSourceService.list(routeParam(req, 'profileId'), userId(req)),
      });
    } catch (error) {
      next(error);
    }
  },

  async upsert(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = upsertSourceSubscriptionSchema.parse(req.body);
      const subscription = await profileSourceService.upsert(
        routeParam(req, 'profileId'),
        routeParam(req, 'sourceId'),
        userId(req),
        input,
      );
      res.status(200).json({ subscription });
    } catch (error) {
      next(error);
    }
  },

  async remove(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await profileSourceService.remove(routeParam(req, 'profileId'), routeParam(req, 'sourceId'), userId(req));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
