import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.app.env === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (config.app.env !== 'production') globalForPrisma.prisma = prisma;
