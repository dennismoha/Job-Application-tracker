import type { NextFunction, Request, Response } from 'express';

import { BadRequestError, UnauthorizedError } from '../../shared/http/http-error.js';
import { createProfileSchema, updateProfileSchema } from './profile.schemas.js';
import { profileService } from './profile.service.js';

function currentUserId(req: Request): string {
  if (!req.currentUser) {
    throw new UnauthorizedError();
  }

  return req.currentUser.id;
}

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !value) throw new BadRequestError(`Route parameter "${name}" is required.`);
  return value;
}

export const profileController = {
  async list(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ profiles: await profileService.list(currentUserId(req)) });
    } catch (error) {
      next(error);
    }
  },

  async get(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        profile: await profileService.get(routeParam(req, 'profileId'), currentUserId(req)),
      });
    } catch (error) {
      next(error);
    }
  },

  async create(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createProfileSchema.parse(req.body);
      const profile = await profileService.create(currentUserId(req), input);
      res.status(201).json({ profile });
    } catch (error) {
      next(error);
    }
  },

  async update(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateProfileSchema.parse(req.body);
      const profile = await profileService.update(routeParam(req, 'profileId'), currentUserId(req), input);
      res.status(200).json({ profile });
    } catch (error) {
      next(error);
    }
  },

  async remove(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await profileService.remove(routeParam(req, 'profileId'), currentUserId(req));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
