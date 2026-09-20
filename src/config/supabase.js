import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let supabaseClient = null;

export function getSupabase() {
  if (supabaseClient) return supabaseClient;

  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  if (!env.SUPABASE_URL || !key) {
    logger.warn(
      'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured in .env. Using mockable fallback client.'
    );
  }

  supabaseClient = createClient(env.SUPABASE_URL, key || 'dummy-key-for-initialization', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
}

export const supabase = getSupabase();

export async function checkSupabaseConnection() {
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
