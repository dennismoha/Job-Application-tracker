import { PrismaClient } from '@prisma/client';

declare global {
  // Keep one Prisma client during local hot reloads so development does not open extra pools.
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
