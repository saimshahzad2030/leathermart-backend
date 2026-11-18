import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

/**
 * Safely extracts host:port from a database URL without exposing credentials.
 * @param {string} url
 * @returns {string} host or 'NONE' / 'INVALID_URL'
 */
export function getDatabaseHost(url = process.env.DATABASE_URL || '') {
  if (!url) return 'NONE';
  try {
    const parsed = new URL(url);
    return parsed.host;
  } catch {
    return 'INVALID_URL';
  }
}

// ==========================================
// Environment Configuration Selection
// Priority:
// 1. Explicit process.env.DB_TARGET or process.env.DATABASE_TARGET ('local' | 'remote' | 'supabase')
// 2. Pre-injected environment (e.g. from node --env-file)
// 3. Default to project .env (remote Supabase)
// ==========================================
const explicitTarget = (process.env.DB_TARGET || process.env.DATABASE_TARGET || '').toLowerCase().trim();
let activeEnvFile = '.env';

if (explicitTarget === 'local') {
  const localEnvPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath, override: true });
    activeEnvFile = '.env.local';
  } else {
    throw new Error("DB_TARGET is set to 'local', but .env.local was not found on disk.");
  }
} else if (explicitTarget === 'remote' || explicitTarget === 'supabase') {
  const remoteEnvPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(remoteEnvPath)) {
    dotenv.config({ path: remoteEnvPath, override: true });
    activeEnvFile = '.env';
  } else {
    throw new Error("DB_TARGET is set to 'remote', but .env was not found on disk.");
  }
} else {
  // If not explicitly set via DB_TARGET:
  // If DATABASE_URL was already supplied (e.g. by node --env-file), respect it without overriding
  if (!process.env.DATABASE_URL) {
    const defaultEnvPath = path.resolve(process.cwd(), '.env');
    dotenv.config({ path: defaultEnvPath });
    activeEnvFile = '.env';
  } else {
    const host = getDatabaseHost(process.env.DATABASE_URL);
    activeEnvFile = host.includes('localhost') || host.includes('127.0.0.1') ? '.env.local' : '.env';
  }
}

const currentDbHost = getDatabaseHost(process.env.DATABASE_URL);
const isLocalTarget = currentDbHost.includes('localhost') || currentDbHost.includes('127.0.0.1');

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || '',
  DIRECT_URL: process.env.DIRECT_URL || '',
  DB_TARGET: isLocalTarget ? 'local' : 'remote',
  DB_HOST: currentDbHost,
  ACTIVE_ENV_FILE: activeEnvFile,

  // Supabase Storage Configuration (Media Assets)
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
  SUPABASE_ANON_KEY:
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '',
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'media',

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'atelier_valenti_milano_secret_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'atelier_valenti_milano_refresh_2026',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // Client URLs (CORS)
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  ADMIN_URL: process.env.ADMIN_URL || 'http://localhost:3001',

  // Upload limits
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),

  // Environment checks
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isTest: (process.env.NODE_ENV || '') === 'test',
  isProd: (process.env.NODE_ENV || '') === 'production',
  isServerless: Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
};

export function validateProductionEnv() {
  if (env.isProd || env.isServerless) {
    const missing = [];
    if (!env.DATABASE_URL) missing.push('DATABASE_URL');
    if (!env.SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_ANON_KEY) {
      missing.push('SUPABASE_SERVICE_ROLE_KEY');
    }
    if (!env.JWT_SECRET || env.JWT_SECRET === 'atelier_valenti_milano_secret_2026') {
      missing.push('JWT_SECRET (using default secret in production is unsafe)');
    }
    if (missing.length > 0) {
      throw new Error(
        `[CRITICAL] Missing required environment variables: ${missing.join(', ')}`
      );
    }
  }
}
