import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import { readCookie } from '../../shared/http/cookies.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import { hashSessionToken } from '../../shared/security/session-token.js';
import { SESSION_COOKIE_NAME } from './auth.service.js';

function getRequestToken(req: Request): string | undefined {
  const bearer = req.headers.authorization;

  if (bearer?.startsWith('Bearer ')) {
    return bearer.slice('Bearer '.length).trim();
  }

  return readCookie(req, SESSION_COOKIE_NAME);
}

export async function requireUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = getRequestToken(req);

    if (!token) {
      throw new UnauthorizedError();
    }

    const session = await prisma.userSession.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedError('Your session has expired or is no longer active.');
    }

    req.currentUser = session.user;
    req.currentSessionId = session.id;

    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    next();
  } catch (error) {
    next(error);
  }
}
