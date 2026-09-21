import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let supabaseClient = null;

export function getSupabase() {
  if (supabaseClient) return supabaseClient;

  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

  const isProd =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.VERCEL) ||
    env.isProd ||
    env.isServerless;

  if (!url || !key) {
    if (isProd) {
      throw new Error(
        'Supabase configuration error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) are required in production environment variables.'
      );
    }
    logger.warn(
      'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured. Supabase operations will fail unless valid credentials are provided.'
    );
    supabaseClient = createClient(
      url || 'https://placeholder.supabase.co',
      key || 'dummy-key-for-development',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
    return supabaseClient;
  }

  supabaseClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
}

// Lazy proxy so importing this module does not throw prematurely before credentials are used,
// but accessing Supabase operations in production without credentials will fail with a clear configuration error.
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getSupabase();
      const value = client[prop];
      if (typeof value === 'function') {
        return value.bind(client);
      }
      return value;
    },
  }
);

export async function checkSupabaseConnection() {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    const msg = 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured in environment variables.';
    logger.warn(msg);
    return { connected: false, message: msg };
  }

  try {
    const client = getSupabase();
    const { error } = await client.from('categories').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      logger.warn(`Supabase query check returned warning: ${error.message}`);
      return { connected: false, message: error.message };
    }
    return { connected: true, message: 'Connected to Supabase PostgreSQL' };
  } catch (err) {
    logger.error(`Supabase connectivity check error: ${err.message}`);
    return { connected: false, message: err.message };
  }
}
