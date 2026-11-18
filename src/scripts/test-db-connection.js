import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL || '';
let host = 'UNKNOWN';
try {
  const parsed = new URL(dbUrl);
  host = parsed.host;
} catch (e) {
  host = 'INVALID_URL';
}

console.log(`[VERIFY] Database host: ${host}`);

const prisma = new PrismaClient({
  datasourceUrl: dbUrl,
});

async function main() {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1 as connected`;
    const elapsed = Date.now() - start;
    console.log(`[VERIFY] Connection Status: SUCCESS (${elapsed}ms) to ${host}`);
  } catch (err) {
    console.log(`[VERIFY] Connection Status: FAILED to ${host}`);
    console.log(`[VERIFY] Error message: ${err.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
