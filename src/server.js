import 'dotenv/config';
import { app } from './app.js';
import { env } from './config/env.js';
import { checkPrismaConnection } from './lib/prisma.js';
import { logger } from './utils/logger.js';

async function startServer() {
  const dbCheck = await checkPrismaConnection();
  if (dbCheck.connected) {
    logger.info('Connected to Supabase PostgreSQL via Prisma ORM successfully.');
  } else {
    logger.warn(`Prisma PostgreSQL connection status: ${dbCheck.message}`);
  }

  const server = app.listen(env.PORT, () => {
    logger.info(
      `Atelier Valenti Milano server is listening at http://localhost:${env.PORT} in ${env.NODE_ENV} mode`
    );
    logger.info(`Health check available at http://localhost:${env.PORT}/api/health`);
  });

  const handleShutdown = async (signal) => {
    logger.info(`Received ${signal}. Gracefully shutting down...`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });

    // Force shutdown if taking too long
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});
