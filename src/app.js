import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import os from 'os';

import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { apiRateLimiter } from './middlewares/rateLimiter.js';
import { ApiResponse } from './utils/apiResponse.js';
import { HTTP_STATUS } from './config/constants.js';

export const app = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
const allowedOrigins = [
  env.FRONTEND_URL,
  env.ADMIN_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()) : []),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        env.isDev ||
        env.isTest;
      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: This origin is not allowed by Access-Control-Allow-Origin'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

// Compression & parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging (non-test environments)
if (!env.isTest) {
  app.use(morgan(env.isDev ? 'dev' : 'combined'));
}

// Rate limiting for API requests
app.use('/api', apiRateLimiter);

// Serve static uploaded assets
const uploadsDir = env.isServerless
  ? path.join(os.tmpdir(), env.UPLOAD_DIR)
  : path.resolve(process.cwd(), env.UPLOAD_DIR);
app.use(`/${env.UPLOAD_DIR}`, express.static(uploadsDir));

// Health check endpoint (no authentication or database query required)
app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount REST APIs
app.use('/api', routes);

// Root greeting
app.get('/', (req, res) => {
  return ApiResponse.success(res, {
    message: 'Welcome to the Atelier Valenti Milano Luxury Leather REST API server.',
    data: {
      documentation: '/api/health',
      version: '1.0.0',
    },
  });
});

// 404 Route Handler
app.use((req, res) => {
  return ApiResponse.error(res, {
    message: `API endpoint '${req.method} ${req.originalUrl}' not found`,
    errorCode: 'ERR_ENDPOINT_NOT_FOUND',
    statusCode: HTTP_STATUS.NOT_FOUND,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
