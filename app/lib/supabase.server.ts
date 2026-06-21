import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '~/lib/database.types';

export type SupabaseServerClient = SupabaseClient<Database>;

export function createSupabaseServerClient(env: Env): SupabaseServerClient {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createSupabaseAnonClient(env: Env): SupabaseClient<Database> {
  const url = env.SUPABASE_URL;
  const key = env.PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY must be set');
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createSupabaseUserClient(
  env: Env,
  accessToken: string,
): SupabaseClient<Database> {
  const url = env.SUPABASE_URL;
  const key = env.PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY must be set');
  }

  return createClient<Database>(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
