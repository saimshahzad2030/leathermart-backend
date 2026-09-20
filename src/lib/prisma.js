import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const globalForPrisma = globalThis;
const connectionUrl = (env.DATABASE_URL || process.env.DATABASE_URL || '').trim();

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    ...(connectionUrl ? { datasourceUrl: connectionUrl } : {}),
    log: env.isDev ? ['error', 'warn'] : ['error'],
  });

// Always cache Prisma instance on globalThis to prevent connection leaks across serverless warm invocations
globalForPrisma.prisma = prisma;

export async function checkPrismaConnection() {
  if (!connectionUrl && !process.env.DATABASE_URL) {
    const msg = 'DATABASE_URL environment variable is missing. Please configure it in Vercel project settings.';
    logger.warn(msg);
    return { connected: false, message: msg };
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true, message: 'Connected to Supabase PostgreSQL (via Prisma)' };
  } catch (err) {
    logger.warn(`Prisma connection check warning: ${err.message}`);
    return { connected: false, message: err.message };
  }
}
