import { IngestionStatus } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';

const listSchema = z.object({
  status: z.nativeEnum(IngestionStatus).default(IngestionStatus.QUARANTINED),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

function currentUserId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

export const ingestionController = {
  async list(this: void, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = currentUserId(req);
      const input = listSchema.parse(req.query);
      const ingestions = await prisma.jobIngestion.findMany({
        where: {
          status: input.status,
          source: {
            OR: [
              { createdByUserId: userId },
              { subscriptions: { some: { profile: { userId } } } },
            ],
          },
        },
        include: { source: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });
      res.status(200).json({ ingestions });
    } catch (error) {
      next(error);
    }
  },
};
