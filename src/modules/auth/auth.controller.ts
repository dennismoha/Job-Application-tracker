import type { NextFunction, Request, Response } from 'express';

import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../shared/http/http-error.js';
import { authService, SESSION_COOKIE_NAME } from './auth.service.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'none',
    secure: env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  });
}

export const authController = {
  async register(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = registerSchema.parse(req.body);
      const result = await authService.register(input);

      setSessionCookie(res, result.session.token, result.session.expiresAt);
      res.status(201).json({ user: result.user });
    } catch (error) {
      next(error);
    }
  },

  async login(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = loginSchema.parse(req.body);
      const result = await authService.login(input);

      setSessionCookie(res, result.session.token, result.session.expiresAt);
      res.status(200).json({ user: result.user });
    } catch (error) {
      next(error);
    }
  },

  async logout(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.currentSessionId) {
        throw new UnauthorizedError();
      }

      await authService.logout(req.currentSessionId);
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  me(this: void, req: Request, res: Response): void {
    if (!req.currentUser) {
      throw new UnauthorizedError();
    }

    res.status(200).json({
      user: {
        id: req.currentUser.id,
        email: req.currentUser.email,
        name: req.currentUser.name,
        createdAt: req.currentUser.createdAt,
        updatedAt: req.currentUser.updatedAt,
      },
    });
  },
};
