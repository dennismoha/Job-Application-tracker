import type { User } from '@prisma/client';

import { env } from '../../config/env.js';
import { ConflictError, UnauthorizedError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import { hashPassword, verifyPassword } from '../../shared/security/password.js';
import { createSessionToken, hashSessionToken } from '../../shared/security/session-token.js';

export const SESSION_COOKIE_NAME = 'job_intel_session';

interface RegisterInput {
  email: string;
  name?: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

function publicUser(user: User): Pick<User, 'id' | 'email' | 'name' | 'createdAt' | 'updatedAt'> {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function createUserSession(userId: string): Promise<CreatedSession> {
  const token = createSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.SESSION_TTL_DAYS);

  await prisma.userSession.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export const authService = {
  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictError('An account already exists for this email address.');
    }

    const user = await prisma.user.create({
      data: {
        email: input.email,
        ...(input.name === undefined ? {} : { name: input.name }),
        passwordHash: await hashPassword(input.password),
      },
    });

    return {
      user: publicUser(user),
      session: await createUserSession(user.id),
    };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    return {
      user: publicUser(user),
      session: await createUserSession(user.id),
    };
  },

  async logout(sessionId: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  },
};
