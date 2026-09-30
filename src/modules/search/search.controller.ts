import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import { webSearchSchema } from './search.schemas.js';
import { searchService } from './search.service.js';

export const searchController = {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.currentUser) throw new UnauthorizedError();
      const input = webSearchSchema.parse(req.body);
      res.status(200).json(await searchService.search(req.currentUser.id, input));
    } catch (error) {
      next(error);
    }
  },
};
