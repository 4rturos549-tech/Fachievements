import { createClient } from '@supabase/supabase-js';

// En Astro, las variables PUBLIC_ están disponibles en cliente via import.meta.env
// Asegúrate de que en .env estén como PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase. Verifica tu archivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
