import type { APIRoute, AstroCookies } from 'astro';
import { createServerSupabase } from '../../../lib/supabase';
import { verifyAdminPassword } from '../../../lib/admin-auth';

function isAuthorized(request: Request, cookies: AstroCookies, body: { password?: unknown }): boolean {
  if (cookies.get('fach_admin')?.value === '1') return true;
  const header = request.headers.get('x-admin-password');
  if (header && verifyAdminPassword(header)) return true;
  if (typeof body.password === 'string' && verifyAdminPassword(body.password)) return true;
  return false;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { igdb_id?: unknown; manifest?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!isAuthorized(request, cookies, body)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const igdbIdNum = Number(body.igdb_id);
  if (!Number.isInteger(igdbIdNum) || igdbIdNum <= 0) {
    return Response.json({ error: 'igdb_id inválido' }, { status: 400 });
  }
  if (!body.manifest || typeof body.manifest !== 'object') {
    return Response.json({ error: 'manifest inválido' }, { status: 400 });
  }

  const manifest = body.manifest as Record<string, unknown>;
  const required = ['title', 'achievements', 'playthroughs'] as const;
  const missing = required.filter(k => !(k in manifest));
  if (missing.length > 0) {
    return Response.json({ error: `Faltan campos en manifest: ${missing.join(', ')}` }, { status: 400 });
  }

  try {
    const supabase = createServerSupabase();
    const { error } = await supabase
      .from('game_guides')
      .upsert(
        { igdb_id: String(igdbIdNum), manifest, updated_at: new Date().toISOString() },
        { onConflict: 'igdb_id' }
      );

    if (error) {
      console.error('[upload-guide] supabase:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('[upload-guide]', e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
};
