import type { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      currentUser?: User;
      currentSessionId?: string;
    }
  }
}

export {};
