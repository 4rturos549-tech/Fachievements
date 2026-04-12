import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');

export const GET: APIRoute = async () => {
  try {
    const supabase = createClient(
      env.PUBLIC_SUPABASE_URL,
      env.PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from('game_guides')
      .select('igdb_id, manifest->title, created_at')
      .order('created_at', { ascending: false });

    if (error) return new Response(JSON.stringify([]), { status: 200 });

    const result = (data || []).map((row: any) => ({
      igdb_id: row.igdb_id,
      title: row.title || 'Sin título',
      created_at: row.created_at,
    }));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify([]), { status: 200 });
  }
};
