import type { Request, Response } from 'express';

import { prisma } from '../../shared/prisma/prisma-client.js';

export function getLiveHealth(_req: Request, res: Response): void {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
}

export async function getReadyHealth(_req: Request, res: Response): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'not_ready', database: 'unavailable', timestamp: new Date().toISOString() });
  }
}
