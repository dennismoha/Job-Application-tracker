import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import { hashSessionToken } from '../../shared/security/session-token.js';

/**
 * Browser companion tokens are intentionally separate from web sessions.
 * A browser extension can be revoked without logging the user out everywhere.
 */
export async function requireBrowserCompanion(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : undefined;

    if (!token) throw new UnauthorizedError('A browser companion token is required.');

    const record = await prisma.browserCompanionToken.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true },
    });

    if (!record || record.revokedAt || (record.expiresAt && record.expiresAt <= new Date())) {
      throw new UnauthorizedError('This browser companion token is invalid or has expired.');
    }

    req.currentUser = record.user;
    await prisma.browserCompanionToken.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
    next();
  } catch (error) {
    next(error);
  }
}
