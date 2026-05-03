import type { APIRoute } from 'astro';
import { createServerSupabase } from '../../../lib/supabase';
import { getCoversByIds } from '../../../lib/igdb';
import type { Manifest } from '../../../lib/types';

export const GET: APIRoute = async ({ params }) => {
  const handle = params.handle?.toLowerCase().trim();
  if (!handle || !/^[a-z0-9_]{3,24}$/.test(handle)) {
    return Response.json({ error: 'Handle inválido' }, { status: 400 });
  }

  try {
    const supabase = createServerSupabase();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('handle', handle)
      .maybeSingle();

    if (error || !profile) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

    // Steps del usuario
    const { data: stepsRaw } = await supabase
      .from('completed_steps')
      .select('step_id, igdb_id, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    const steps = (stepsRaw ?? []) as { step_id: string; igdb_id: string | null; created_at: string }[];

    // Agrupar por juego
    const byGame: Record<string, number> = {};
    for (const s of steps) if (s.igdb_id) byGame[s.igdb_id] = (byGame[s.igdb_id] ?? 0) + 1;
    const igdbIds = Object.keys(byGame);

    let games: Array<{ igdbId: string; name: string; completed: number; total: number; percentage: number; coverUrl: string | null }> = [];

    if (igdbIds.length > 0) {
      const { data: guides } = await supabase
        .from('game_guides')
        .select('igdb_id, manifest')
        .in('igdb_id', igdbIds);

      const guidesTyped = (guides ?? []) as { igdb_id: string; manifest: Manifest }[];
      const numericIds = igdbIds.map(Number).filter(n => Number.isInteger(n) && n > 0);
      let covers: Record<number, string | null> = {};
      try { covers = await getCoversByIds(numericIds); } catch {}

      games = igdbIds.map(igdbId => {
        const guide = guidesTyped.find(g => g.igdb_id === igdbId);
        let name = `Juego ${igdbId}`;
        let total = 0;
        if (guide?.manifest) {
          name = guide.manifest.title || name;
          total = guide.manifest.playthroughs.reduce(
            (acc, p) => acc + p.zones.reduce((z, zone) => z + zone.steps.filter(s => s.type !== 'tip').length, 0),
            0
          );
        }
        const completed = byGame[igdbId] ?? 0;
        const percentage = total > 0 ? Math.min(Math.round((completed / total) * 100), 100) : 0;
        return { igdbId, name, completed, total, percentage, coverUrl: covers[Number(igdbId)] ?? null };
      });
      games.sort((a, b) => b.percentage - a.percentage);
    }

    return Response.json({
      profile,
      games,
      totalSteps: steps.length,
      activity: steps.slice(0, 10),
      timestamps: steps.map(s => s.created_at),
    }, { status: 200, headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (e) {
    console.error('[api/profile/handle]', e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
};
