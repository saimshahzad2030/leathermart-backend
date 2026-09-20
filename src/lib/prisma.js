import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: env.DATABASE_URL || process.env.DATABASE_URL,
    log: env.isDev ? ['error', 'warn'] : ['error'],
  });

if (!env.isProd) globalForPrisma.prisma = prisma;

export async function checkPrismaConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true, message: 'Connected to Supabase PostgreSQL (via Prisma)' };
  } catch (err) {
    logger.warn(`Prisma connection check warning: ${err.message}`);
    return { connected: false, message: err.message };
  }
}
