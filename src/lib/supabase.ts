import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY. Revisa tu .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function createServerSupabase(): SupabaseClient {
  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = (import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY) as string | undefined;
  if (!url || !serviceKey) {
    throw new Error('Faltan variables de entorno de Supabase en el servidor');
  }
  return createClient(url, serviceKey);
}
