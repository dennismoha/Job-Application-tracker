import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import { createProfileSchema, updateProfileSchema } from './profile.schemas.js';
import { profileService } from './profile.service.js';

function currentUserId(req: Request): string {
  if (!req.currentUser) {
    throw new UnauthorizedError();
  }

  return req.currentUser.id;
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
        profile: await profileService.get(req.params.profileId, currentUserId(req)),
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
      const profile = await profileService.update(req.params.profileId, currentUserId(req), input);
      res.status(200).json({ profile });
    } catch (error) {
      next(error);
    }
  },

  async remove(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await profileService.remove(req.params.profileId, currentUserId(req));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
