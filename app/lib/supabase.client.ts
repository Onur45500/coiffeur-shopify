import {createClient} from '@supabase/supabase-js';
import type {Database} from '~/lib/database.types';

export function createSupabaseBrowserClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
