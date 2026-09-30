import { Router } from 'express';

import { requireUser } from '../auth/auth.middleware.js';
import { searchController } from './search.controller.js';

export const searchRouter = Router();

searchRouter.use(requireUser);
searchRouter.post('/', searchController.search);
