import { Router } from 'express';

import { requireUser } from '../auth/auth.middleware.js';
import { categoryController } from './category.controller.js';
import { profileController } from './profile.controller.js';
import { profileSourceController } from './profile-source.controller.js';

export const profileRouter = Router();

profileRouter.use(requireUser);
profileRouter.get('/categories', categoryController.list);
profileRouter.get('/', profileController.list);
profileRouter.post('/', profileController.create);
profileRouter.get('/:profileId', profileController.get);
profileRouter.patch('/:profileId', profileController.update);
profileRouter.get('/:profileId/sources', profileSourceController.list);
profileRouter.put('/:profileId/sources/:sourceId', profileSourceController.upsert);
profileRouter.delete('/:profileId/sources/:sourceId', profileSourceController.remove);
profileRouter.delete('/:profileId', profileController.remove);
