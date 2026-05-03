import type { APIRoute } from 'astro';
import { createServerSupabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ cookies }) => {
  if (cookies.get('fach_admin')?.value !== '1') {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('game_guides')
      .select('igdb_id, manifest->title, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[list-guides]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    const result = (data ?? []).map(row => ({
      igdb_id: String(row.igdb_id),
      title: typeof row.title === 'string' && row.title ? row.title : 'Sin título',
      created_at: String(row.created_at),
    }));
    return Response.json(result, { status: 200 });
  } catch (e) {
    console.error('[list-guides]', e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
};
