import type { APIRoute } from 'astro';
import { createServerSupabase } from '../../lib/supabase';
import { ACCENTS } from '../../lib/types';
import type { AccentColor } from '../../lib/types';

const HANDLE_RE = /^[a-z0-9_]{3,24}$/;
const ACCENT_KEYS = Object.keys(ACCENTS) as AccentColor[];

export const PATCH: APIRoute = async ({ request }) => {
  const auth = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  if (!auth) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: userData, error: userErr } = await supabase.auth.getUser(auth);
  if (userErr || !userData.user) return Response.json({ error: 'Sesión inválida' }, { status: 401 });
  const userId = userData.user.id;

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON inválido' }, { status: 400 }); }

  const patch: Record<string, unknown> = {};

  if (typeof body.handle === 'string') {
    const h = body.handle.trim().toLowerCase();
    if (!HANDLE_RE.test(h)) return Response.json({ error: 'Handle inválido (3–24, solo a-z 0-9 _)' }, { status: 400 });
    patch.handle = h;
  }
  if (typeof body.display_name === 'string') patch.display_name = body.display_name.trim().slice(0, 40) || null;
  if (typeof body.bio === 'string') patch.bio = body.bio.trim().slice(0, 200) || null;
  if (typeof body.accent_color === 'string' && ACCENT_KEYS.includes(body.accent_color as AccentColor)) {
    patch.accent_color = body.accent_color;
  }
  if (body.avatar_igdb_id === null || Number.isInteger(body.avatar_igdb_id)) patch.avatar_igdb_id = body.avatar_igdb_id;
  if (body.banner_igdb_id === null || Number.isInteger(body.banner_igdb_id)) patch.banner_igdb_id = body.banner_igdb_id;
  if (body.favorite_step_id === null || typeof body.favorite_step_id === 'string') patch.favorite_step_id = body.favorite_step_id;
  if (body.current_game_id === null || typeof body.current_game_id === 'string') patch.current_game_id = body.current_game_id;
  if (Array.isArray(body.showcase_games)) {
    const arr = body.showcase_games.map(Number).filter(n => Number.isInteger(n) && n > 0).slice(0, 4);
    patch.showcase_games = arr;
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: 'Sin cambios' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    if (error.message.includes('duplicate') || error.code === '23505') {
      return Response.json({ error: 'Ese handle ya está cogido' }, { status: 409 });
    }
    console.error('[api/profile PATCH]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json(data, { status: 200 });
};
