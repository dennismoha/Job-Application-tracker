import { Router } from 'express';

import { authController } from './auth.controller.js';
import { requireUser } from './auth.middleware.js';

export const authRouter = Router();

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/logout', requireUser, authController.logout);
authRouter.get('/me', requireUser, authController.me);
