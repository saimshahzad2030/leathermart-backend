import { Router } from 'express';
import { checkPrismaConnection } from '../lib/prisma.js';
import publicRoutes from './public.routes.js';
import adminRoutes from './admin.routes.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router = Router();

// Health Check Endpoint
router.get('/health', async (req, res) => {
  const dbCheck = await checkPrismaConnection();

  const sanitizeError = (msg) => {
    if (!msg || typeof msg !== 'string') return null;
    return msg.replace(/:\/\/[^:]+:[^@]+@/g, '://***:***@');
  };

  return ApiResponse.success(res, {
    message: 'Atelier Valenti Milano API is operational and healthy',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbCheck.connected ? 'connected' : 'disconnected',
      databaseDetails: {
        host: dbCheck.host || 'NONE',
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasDirectUrl: Boolean(process.env.DIRECT_URL),
        connectionMessage: sanitizeError(dbCheck.message),
      },
      orm: 'Prisma',
      databaseType: 'Supabase PostgreSQL',
      environment: process.env.NODE_ENV || 'development',
      vercel: {
        isServerless: Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
        environment: process.env.VERCEL_ENV || 'non-vercel',
        region: process.env.VERCEL_REGION || 'local',
      },
    },
  });
});

// v1 Routes
router.use('/v1/admin', adminRoutes);
router.use('/v1', publicRoutes);

// Direct /api fallbacks
router.use('/admin', adminRoutes);
router.use('/', publicRoutes);

export default router;
