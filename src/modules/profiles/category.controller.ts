import type { NextFunction, Request, Response } from 'express';

import { prisma } from '../../shared/prisma/prisma-client.js';

export const categoryController = {
  async list(this: void, _req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await prisma.jobCategory.findMany({
        where: { parentId: null },
        include: {
          children: {
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });

      res.status(200).json({ categories });
    } catch (error) {
      next(error);
    }
  },
};
