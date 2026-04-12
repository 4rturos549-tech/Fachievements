import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');
const ADMIN_PASSWORD = 'fachievements2024'; // Cámbiala a la misma que en admin.astro

export const POST: APIRoute = async ({ request }) => {
  try {
    const { igdb_id, manifest, password } = await request.json();

    if (password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }
    if (!igdb_id || !manifest) {
      return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400 });
    }

    // Usamos la anon key con upsert — la política RLS permite service_role
    // Para escritura desde el servidor usamos la SERVICE_ROLE_KEY si la tienes
    // Si no, desactiva temporalmente RLS en Supabase para hacer el upsert
    const supabase = createClient(
      env.PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY
    );

    const { error } = await supabase
      .from('game_guides')
      .upsert(
        { igdb_id: String(igdb_id), manifest, updated_at: new Date().toISOString() },
        { onConflict: 'igdb_id' }
      );

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
