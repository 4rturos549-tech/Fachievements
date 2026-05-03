import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { Manifest } from '../lib/types';

interface GameProgress {
  igdbId: string;
  name: string;
  completedSteps: number;
  totalSteps: number;
  percentage: number;
  coverUrl: string | null;
}

interface CompletedStepRow {
  step_id: string;
  igdb_id: string | null;
  created_at: string;
}

interface GuideRow {
  igdb_id: string;
  manifest: Manifest;
}

export default function Profile({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true);
  const [totalChecks, setTotalChecks] = useState(0);
  const [activeGames, setActiveGames] = useState<GameProgress[]>([]);
  const [memberSince, setMemberSince] = useState<string>('');
  const [lastActivity, setLastActivity] = useState<string>('');

  const avatar = (session.user.email?.charAt(0) ?? '?').toUpperCase();
  const username = session.user.email?.split('@')[0] ?? '';

  useEffect(() => {
    async function load() {
      // Steps completados
      const { data: steps, error } = await supabase
        .from('completed_steps')
        .select('step_id, igdb_id, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error || !steps) { setLoading(false); return; }
      const rows = steps as CompletedStepRow[];
      setTotalChecks(rows.length);

      if (rows[0]?.created_at) {
        const d = new Date(rows[0].created_at);
        setLastActivity(d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }));
      }

      // Member since (creación de la cuenta de auth)
      if (session.user.created_at) {
        const d = new Date(session.user.created_at);
        setMemberSince(d.toLocaleDateString('es', { month: 'short', year: 'numeric' }));
      }

      const byGame: Record<string, number> = {};
      for (const row of rows) {
        if (row.igdb_id) byGame[row.igdb_id] = (byGame[row.igdb_id] ?? 0) + 1;
      }
      const igdbIds = Object.keys(byGame);
      if (igdbIds.length === 0) { setLoading(false); return; }

      // Manifest data
      const { data: guides } = await supabase
        .from('game_guides')
        .select('igdb_id, manifest')
        .in('igdb_id', igdbIds);
      const guidesTyped = (guides ?? []) as GuideRow[];

      // Cover urls de IGDB
      let covers: Record<number, string | null> = {};
      try {
        const res = await fetch(`/api/game-covers?ids=${igdbIds.join(',')}`);
        if (res.ok) covers = await res.json();
      } catch {}

      const games: GameProgress[] = igdbIds.map(igdbId => {
        const guide = guidesTyped.find(g => g.igdb_id === igdbId);
        let name = `Juego ${igdbId}`;
        let totalSteps = 0;
        if (guide?.manifest) {
          name = guide.manifest.title || name;
          totalSteps = guide.manifest.playthroughs.reduce(
            (acc, p) => acc + p.zones.reduce(
              (z, zone) => z + zone.steps.filter(s => s.type !== 'tip').length, 0
            ), 0
          );
        }
        const completed = byGame[igdbId] ?? 0;
        const percentage = totalSteps > 0 ? Math.min(Math.round((completed / totalSteps) * 100), 100) : 0;
        return { igdbId, name, completedSteps: completed, totalSteps, percentage, coverUrl: covers[Number(igdbId)] ?? null };
      });

      games.sort((a, b) => b.percentage - a.percentage);
      setActiveGames(games);
      setLoading(false);
    }

    load();
  }, [session.user.id, session.user.created_at]);

  const platinos = activeGames.filter(g => g.percentage === 100).length;

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: '#2a2a2a', fontSize: '0.72rem', letterSpacing: '0.15em', fontFamily: "'DM Mono',monospace" }}>
      Cargando perfil...
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Header con cover collage de fondo si hay juegos */}
      <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1px solid #1a1a1a', background: '#0a0a0a' }}>
        {activeGames.length > 0 && (
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', opacity: 0.18, filter: 'blur(8px) saturate(0.6)' }}>
            {activeGames.slice(0, 6).map(g => (
              g.coverUrl ? <img key={g.igdbId} src={g.coverUrl} alt="" style={{ flex: 1, width: 0, height: '100%', objectFit: 'cover' }} /> : null
            ))}
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.7) 60%, rgba(10,10,10,0.95) 100%)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
          <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, rgba(245,166,35,0.2), rgba(245,166,35,0.05))', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '2rem', color: '#f5a623', flexShrink: 0 }}>
            {avatar}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', letterSpacing: '0.18em', color: '#f5a623', textTransform: 'uppercase', margin: '0 0 4px' }}>
              {platinos > 0 ? `Cazador · ${platinos} platino${platinos === 1 ? '' : 's'}` : 'Cazador Activo'}
            </p>
            <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.6rem', letterSpacing: '0.06em', color: '#f0ece4', margin: 0, lineHeight: 1 }}>{username}</p>
            <p style={{ fontSize: '0.7rem', color: '#444', margin: '4px 0 0', fontFamily: "'DM Mono',monospace" }}>
              {session.user.email}
              {memberSince && <span style={{ color: '#2a2a2a' }}> · desde {memberSince}</span>}
            </p>
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
      </div>

      {/* Stats */}
      <div>
        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', letterSpacing: '0.18em', color: '#333', textTransform: 'uppercase', marginBottom: '0.85rem' }}>Estadísticas</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
          {[
            { value: totalChecks, label: 'Pasos\ncompletados', color: '#f5a623' },
            { value: activeGames.length, label: 'Juegos\nen progreso', color: '#4a9eff' },
            { value: platinos, label: 'Platinos\nobtenidos', color: '#e8d5ff' },
            { value: lastActivity || '—', label: 'Última\nactividad', color: '#f0ece4', small: true },
          ].map(({ value, label, color, small }) => (
            <div key={label} style={{ background: '#0a0a0a', border: '1px solid #141414', borderRadius: '10px', padding: '1.1rem 0.75rem', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: small ? '1rem' : '2.2rem', color, margin: 0, lineHeight: small ? 1.4 : 1, paddingTop: small ? '0.5rem' : 0, paddingBottom: small ? '0.4rem' : 0 }}>{value}</p>
              <p style={{ fontSize: '0.6rem', color: '#333', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '5px', whiteSpace: 'pre-line', lineHeight: 1.4 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* En progreso */}
      <div>
        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', letterSpacing: '0.18em', color: '#333', textTransform: 'uppercase', marginBottom: '0.85rem' }}>En progreso</p>

        {activeGames.length === 0 ? (
          <div style={{ background: '#0a0a0a', border: '1px dashed #1a1a1a', borderRadius: '10px', padding: '2.5rem 2rem', textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="1.5" style={{ margin: '0 auto 1rem', display: 'block' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <p style={{ color: '#666', fontSize: '0.95rem', margin: '0 0 0.4rem', fontWeight: 500 }}>Tu colección está vacía</p>
            <p style={{ color: '#333', fontSize: '0.78rem', margin: 0, maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>Busca un juego, marca pasos a medida que los consigues, y este perfil se llenará con tus carátulas y progreso.</p>
            <a href="/" style={{ display: 'inline-block', marginTop: '1.25rem', background: '#f5a623', color: '#000', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px' }}>Buscar un juego →</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {activeGames.map(game => (
              <a
                key={game.igdbId}
                href={`/guias/${game.igdbId}`}
                style={{ background: '#0a0a0a', border: '1px solid #141414', borderRadius: '10px', textDecoration: 'none', display: 'flex', overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#141414'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ width: '78px', minHeight: '110px', flexShrink: 0, background: '#0d0d0d', borderRight: '1px solid #141414', position: 'relative', overflow: 'hidden' }}>
                  {game.coverUrl ? (
                    <img src={game.coverUrl} alt={game.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#222', fontSize: '0.6rem' }}>—</div>
                  )}
                  {game.percentage === 100 && (
                    <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#f5a623', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(245,166,35,0.5)' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, padding: '1rem 1.25rem', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: '#f0ece4', fontSize: '0.88rem', fontWeight: 600, margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{game.name}</p>
                      <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: '#333', margin: 0 }}>
                        {game.completedSteps} / {game.totalSteps > 0 ? game.totalSteps : '?'} pasos
                      </p>
                    </div>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.4rem', color: game.percentage === 100 ? '#f5a623' : '#f0ece4', letterSpacing: '0.05em', lineHeight: 1, flexShrink: 0 }}>
                      {game.percentage}%
                    </span>
                  </div>
                  <div style={{ background: '#141414', borderRadius: '99px', height: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${game.percentage}%`, background: game.percentage === 100 ? 'linear-gradient(90deg, #d4891a, #f5a623)' : '#2a2a2a', borderRadius: '99px', transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
                  </div>
                  {game.percentage === 100 && (
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: '#f5a623', margin: '0.5rem 0 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Platino conseguido
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
