import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface GameProgress {
  igdbId: string;
  name: string;
  completedSteps: number;
  totalSteps: number;
  percentage: number;
}

export default function Profile({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true);
  const [totalChecks, setTotalChecks] = useState(0);
  const [activeGames, setActiveGames] = useState<GameProgress[]>([]);

  const avatar = (session.user.email?.charAt(0) ?? '?').toUpperCase();
  const username = session.user.email?.split('@')[0] ?? '';

  useEffect(() => {
    async function load() {
      // 1. Traer todos los steps completados con su igdb_id
      const { data: steps, error } = await supabase
        .from('completed_steps')
        .select('step_id, igdb_id')
        .eq('user_id', session.user.id);

      if (error || !steps) { setLoading(false); return; }

      setTotalChecks(steps.length);

      // 2. Agrupar por igdb_id (solo los que tienen igdb_id guardado)
      const byGame: Record<string, number> = {};
      for (const row of steps) {
        if (row.igdb_id) {
          byGame[row.igdb_id] = (byGame[row.igdb_id] || 0) + 1;
        }
      }

      if (Object.keys(byGame).length === 0) { setLoading(false); return; }

      // 3. Traer manifests de Supabase para obtener nombre y total de pasos
      const igdbIds = Object.keys(byGame);
      const { data: guides } = await supabase
        .from('game_guides')
        .select('igdb_id, manifest')
        .in('igdb_id', igdbIds);

      const games: GameProgress[] = [];

      for (const igdbId of igdbIds) {
        const guide = guides?.find((g: any) => g.igdb_id === igdbId);
        let name = `Juego ${igdbId}`;
        let totalSteps = 0;

        if (guide?.manifest) {
          name = guide.manifest.title || name;
          // Contar pasos checkables (no tips)
          totalSteps = guide.manifest.playthroughs?.reduce(
            (acc: number, p: any) =>
              acc + p.zones.reduce(
                (z: number, zone: any) =>
                  z + zone.steps.filter((s: any) => s.type !== 'tip').length,
                0
              ),
            0
          ) || 0;
        }

        const completed = byGame[igdbId] || 0;
        const percentage = totalSteps > 0 ? Math.min(Math.round((completed / totalSteps) * 100), 100) : 0;

        games.push({ igdbId, name, completedSteps: completed, totalSteps, percentage });
      }

      // Ordenar por porcentaje descendente
      games.sort((a, b) => b.percentage - a.percentage);
      setActiveGames(games);
      setLoading(false);
    }

    load();
  }, [session.user.id]);

  const platinos = activeGames.filter(g => g.percentage === 100).length;

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: '#2a2a2a', fontSize: '0.72rem', letterSpacing: '0.15em', fontFamily: "'DM Mono',monospace" }}>
      Cargando perfil...
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, rgba(245,166,35,0.2), rgba(245,166,35,0.05))', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '2rem', color: '#f5a623', flexShrink: 0 }}>
          {avatar}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', letterSpacing: '0.18em', color: '#f5a623', textTransform: 'uppercase', margin: '0 0 4px' }}>Cazador Activo</p>
          <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.6rem', letterSpacing: '0.06em', color: '#f0ece4', margin: 0, lineHeight: 1 }}>{username}</p>
          <p style={{ fontSize: '0.75rem', color: '#333', margin: '4px 0 0', fontFamily: "'DM Mono',monospace" }}>{session.user.email}</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ background: 'transparent', border: '1px solid #1e1e1e', color: '#444', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.5rem 0.85rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.2s', flexShrink: 0 }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.color = '#e54545'; el.style.borderColor = 'rgba(229,69,69,0.3)'; }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.color = '#444'; el.style.borderColor = '#1e1e1e'; }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Salir
        </button>
      </div>

      <div style={{ height: '1px', background: '#111' }} />

      {/* Stats */}
      <div>
        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', letterSpacing: '0.18em', color: '#333', textTransform: 'uppercase', marginBottom: '0.85rem' }}>Estadísticas</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
          {[
            { value: totalChecks, label: 'Pasos\ncompletados', color: '#f5a623' },
            { value: activeGames.length, label: 'Juegos\nen progreso', color: '#4a9eff' },
            { value: platinos, label: 'Platinos\nobtenidos', color: '#e8d5ff' },
          ].map(({ value, label, color }) => (
            <div key={label} style={{ background: '#0a0a0a', border: '1px solid #141414', borderRadius: '10px', padding: '1.1rem 0.75rem', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2.2rem', color, margin: 0, lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: '0.6rem', color: '#333', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '5px', whiteSpace: 'pre-line', lineHeight: 1.4 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Juegos en progreso */}
      <div>
        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', letterSpacing: '0.18em', color: '#333', textTransform: 'uppercase', marginBottom: '0.85rem' }}>En progreso</p>

        {activeGames.length === 0 ? (
          <div style={{ background: '#0a0a0a', border: '1px dashed #1a1a1a', borderRadius: '10px', padding: '2rem', textAlign: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="1.5" style={{ margin: '0 auto 0.75rem', display: 'block' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <p style={{ color: '#2a2a2a', fontSize: '0.8rem', margin: 0 }}>Todavía no has empezado ninguna guía.</p>
            <a href="/" style={{ color: '#f5a623', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginTop: '0.75rem' }}>Buscar un juego →</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {activeGames.map(game => (
              <a
                key={game.igdbId}
                href={`/guias/${game.igdbId}`}
                style={{ background: '#0a0a0a', border: '1px solid #141414', borderRadius: '10px', padding: '1.1rem 1.25rem', textDecoration: 'none', display: 'block', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#141414')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <p style={{ color: '#f0ece4', fontSize: '0.88rem', fontWeight: 600, margin: '0 0 3px' }}>{game.name}</p>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: '#333', margin: 0 }}>
                      {game.completedSteps} / {game.totalSteps > 0 ? game.totalSteps : '?'} pasos
                    </p>
                  </div>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.4rem', color: game.percentage === 100 ? '#f5a623' : '#f0ece4', letterSpacing: '0.05em', lineHeight: 1 }}>
                    {game.percentage}%
                  </span>
                </div>
                <div style={{ background: '#141414', borderRadius: '99px', height: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${game.percentage}%`, background: game.percentage === 100 ? 'linear-gradient(90deg, #d4891a, #f5a623)' : '#2a2a2a', borderRadius: '99px', transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
                </div>
                {game.percentage === 100 && (
                  <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: '#f5a623', margin: '0.5rem 0 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    🏆 Platino conseguido
                  </p>
                )}
              </a>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
