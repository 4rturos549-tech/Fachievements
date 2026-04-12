import { useState, useEffect } from 'react';
import Tracker from './Tracker';
import type { Session } from '@supabase/supabase-js';

const TROPHY_COLOR: Record<string, string> = { platinum: '#e8d5ff', gold: '#f5a623', silver: '#b0bec5', bronze: '#cd7f32' };
const TROPHY_BG: Record<string, string> = { platinum: 'rgba(232,213,255,0.08)', gold: 'rgba(245,166,35,0.1)', silver: 'rgba(176,190,197,0.08)', bronze: 'rgba(205,127,50,0.08)' };
const TROPHY_BORDER: Record<string, string> = { platinum: 'rgba(232,213,255,0.2)', gold: 'rgba(245,166,35,0.2)', silver: 'rgba(176,190,197,0.15)', bronze: 'rgba(205,127,50,0.15)' };
const TROPHY_LABEL: Record<string, string> = { platinum: 'Platino', gold: 'Oro', silver: 'Plata', bronze: 'Bronce' };

function TrophyIcon({ type, size = 16 }: { type: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={TROPHY_COLOR[type] || '#888'} strokeWidth="1.5">
      <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

export default function GameView({ session, manifest, meta }: { session: Session | null; manifest: any; meta: any }) {
  const [activeTab, setActiveTab] = useState<'info' | 'logros' | 'guia'>('info');
  const [activePlaythrough, setActivePlaythrough] = useState(0);
  const [guideMode, setGuideMode] = useState<'partidas' | 'pasos'>('partidas');
  const [trophyFilter, setTrophyFilter] = useState<string>('all');
  const [spoilerMode, setSpoilerMode] = useState(false);
  const [stepSearch, setStepSearch] = useState('');
  const [shareMsg, setShareMsg] = useState('');

  // Contar missables por partida activa
  const missablesInPlaythrough = manifest?.playthroughs?.[activePlaythrough]?.zones
    ?.flatMap((z: any) => z.steps)
    ?.filter((s: any) => s.type === 'missable').length ?? 0;

  const totalMissables = manifest?.playthroughs
    ?.flatMap((p: any) => p.zones.flatMap((z: any) => z.steps))
    ?.filter((s: any) => s.type === 'missable').length ?? 0;

  const achievements = manifest?.achievements || [];
  const filtered = trophyFilter === 'all' ? achievements : achievements.filter((a: any) => a.type === trophyFilter);
  const counts = {
    all: achievements.length,
    platinum: achievements.filter((a: any) => a.type === 'platinum').length,
    gold: achievements.filter((a: any) => a.type === 'gold').length,
    silver: achievements.filter((a: any) => a.type === 'silver').length,
    bronze: achievements.filter((a: any) => a.type === 'bronze').length,
  };

  // Share URL
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setShareMsg('¡URL copiada!');
      setTimeout(() => setShareMsg(''), 2000);
    });
  };

  const tabs = [
    { key: 'info' as const, label: 'Info', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
    { key: 'logros' as const, label: 'Logros', icon: <TrophyIcon type="gold" size={13} /> },
    {
      key: 'guia' as const,
      label: 'Guía Platino',
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
      badge: totalMissables > 0 ? totalMissables : null,
    },
  ];

  return (
    <div>
      {/* Session + Share bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Botón compartir */}
          <button
            onClick={handleShare}
            style={{ background: 'transparent', border: '1px solid #2a2a2a', color: shareMsg ? '#f5a623' : '#444', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.4rem 0.8rem', borderRadius: '5px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            {shareMsg || 'Compartir'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {session ? (
            <>
              <span style={{ fontSize: '0.7rem', color: '#333', fontFamily: "'DM Mono', monospace" }}>{session.user.email}</span>
              <a href="/perfil" style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#555', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.4rem 0.8rem', borderRadius: '5px', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}>Mi perfil</a>
            </>
          ) : (
            <a href="/perfil" style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', color: '#f5a623', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.45rem 1rem', borderRadius: '6px', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}>
              Iniciar sesión para guardar
            </a>
          )}
        </div>
      </div>

      {/* Info stats */}
      {manifest?.info && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Dificultad', value: manifest.info.difficulty },
            { label: 'Tiempo', value: manifest.info.estimated_time },
            { label: 'Partidas mín.', value: manifest.info.min_playthroughs },
            { label: 'Trofeos', value: manifest.info.total_trophies },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '0.75rem 1rem', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', color: '#f5a623', margin: 0, lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: '0.62rem', color: '#444', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '3px 0 0' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '4px', gap: '3px', marginBottom: '2rem', position: 'sticky', top: '62px', zIndex: 50 }}>
        {tabs.map(({ key, label, icon, badge }: any) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{ flex: 1, padding: '0.6rem 0.5rem', borderRadius: '7px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s', background: activeTab === key ? '#f5a623' : 'transparent', color: activeTab === key ? '#000' : '#444', boxShadow: activeTab === key ? '0 2px 12px rgba(245,166,35,0.2)' : 'none', position: 'relative' }}>
            {icon}{label}
            {/* Badge contador missables */}
            {badge && (
              <span style={{ background: activeTab === key ? 'rgba(0,0,0,0.25)' : 'rgba(229,69,69,0.8)', color: activeTab === key ? '#000' : '#fff', fontSize: '0.55rem', fontWeight: 800, padding: '1px 5px', borderRadius: '99px', lineHeight: 1.4 }}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── INFO ── */}
      {activeTab === 'info' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {meta.screenshots?.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.6rem' }}>
              {meta.screenshots.slice(0, 4).map((img: string, i: number) => (
                <div key={i} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #1a1a1a', aspectRatio: '16/9' }}>
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
          <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '1.5rem' }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.18em', color: '#f5a623', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Sinopsis</p>
            <p style={{ color: '#777', fontSize: '0.93rem', lineHeight: 1.75, margin: 0, fontWeight: 300 }}>{meta.summary || 'Sin descripción disponible.'}</p>
          </div>
          {manifest?.info?.missable_warning && (
            <div style={{ background: 'rgba(229,69,69,0.05)', border: '1px solid rgba(229,69,69,0.15)', borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e54545" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <p style={{ fontSize: '0.8rem', color: '#888', margin: 0, lineHeight: 1.6 }}>{manifest.info.missable_warning}</p>
            </div>
          )}
          {manifest?.info?.tip && (
            <div style={{ background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.12)', borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p style={{ fontSize: '0.8rem', color: '#888', margin: 0, lineHeight: 1.6 }}>{manifest.info.tip}</p>
            </div>
          )}
        </div>
      )}

      {/* ── LOGROS ── */}
      {activeTab === 'logros' && (
        <div>
          {achievements.length > 0 ? (
            <div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {(['all', 'platinum', 'gold', 'silver', 'bronze'] as const).map(f => (
                  <button key={f} onClick={() => setTrophyFilter(f)} style={{ padding: '0.35rem 0.85rem', borderRadius: '5px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', border: `1px solid ${trophyFilter === f ? (f === 'all' ? '#333' : TROPHY_BORDER[f]) : '#1e1e1e'}`, background: trophyFilter === f ? (f === 'all' ? '#1a1a1a' : TROPHY_BG[f]) : 'transparent', color: trophyFilter === f ? (f === 'all' ? '#f0ece4' : TROPHY_COLOR[f]) : '#333', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    {f === 'all' ? `Todos (${counts.all})` : `${TROPHY_LABEL[f]} (${counts[f]})`}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {filtered.map((ach: any) => (
                  <div key={ach.id} style={{ background: TROPHY_BG[ach.type] || '#0d0d0d', border: `1px solid ${TROPHY_BORDER[ach.type] || '#1e1e1e'}`, borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '34px', height: '34px', background: '#0a0a0a', border: `1px solid ${TROPHY_BORDER[ach.type] || '#1e1e1e'}`, borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <TrophyIcon type={ach.type} size={15} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <p style={{ color: '#f0ece4', fontSize: '0.88rem', fontWeight: 600, margin: 0 }}>{ach.title}</p>
                        {ach.missable && (
                          <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '1px 6px', borderRadius: '3px', background: 'rgba(229,69,69,0.1)', color: '#e54545', border: '1px solid rgba(229,69,69,0.2)' }}>Perdible</span>
                        )}
                      </div>
                      <p style={{ color: '#555', fontSize: '0.8rem', margin: 0, lineHeight: 1.55, fontWeight: 300 }}>{ach.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="Sin logros registrados" desc="Añade logros al manifest JSON de este juego." />
          )}
        </div>
      )}

      {/* ── GUÍA PLATINO ── */}
      {activeTab === 'guia' && (
        <div>
          {manifest?.playthroughs?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Toolbar: modo + spoiler + búsqueda */}
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Toggle partidas/pasos */}
                <div style={{ display: 'flex', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '3px', gap: '3px' }}>
                  {([['partidas', 'Por partida'], ['pasos', 'Paso a paso']] as const).map(([key, label]) => (
                    <button key={key} onClick={() => setGuideMode(key)} style={{ padding: '0.4rem 0.85rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s', background: guideMode === key ? '#f5a623' : 'transparent', color: guideMode === key ? '#000' : '#444' }}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Botón spoiler */}
                <button
                  onClick={() => setSpoilerMode(s => !s)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', background: spoilerMode ? 'rgba(245,166,35,0.1)' : 'transparent', border: `1px solid ${spoilerMode ? 'rgba(245,166,35,0.3)' : '#222'}`, color: spoilerMode ? '#f5a623' : '#444', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.4rem 0.85rem', borderRadius: '6px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {spoilerMode
                      ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                      : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    }
                  </svg>
                  {spoilerMode ? 'Spoilers ON' : 'Spoilers OFF'}
                </button>

                {/* Buscador de pasos */}
                <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar paso..."
                    value={stepSearch}
                    onChange={e => setStepSearch(e.target.value)}
                    style={{ width: '100%', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '7px', color: '#f0ece4', fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', padding: '0.4rem 0.75rem 0.4rem 2rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                    onFocus={e => (e.target.style.borderColor = '#7a4e0d')}
                    onBlur={e => (e.target.style.borderColor = '#1e1e1e')}
                  />
                  {stepSearch && (
                    <button onClick={() => setStepSearch('')} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}>×</button>
                  )}
                </div>
              </div>

              {/* Missables badge de partida activa */}
              {guideMode === 'partidas' && missablesInPlaythrough > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(229,69,69,0.05)', border: '1px solid rgba(229,69,69,0.12)', borderRadius: '7px', padding: '0.6rem 1rem' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e54545" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <p style={{ fontSize: '0.75rem', color: '#888', margin: 0 }}>
                    <span style={{ color: '#e54545', fontWeight: 700 }}>{missablesInPlaythrough} perdibles</span> en esta partida — ¡no te los saltes!
                  </p>
                </div>
              )}

              {guideMode === 'partidas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {manifest.playthroughs.map((p: any, i: number) => {
                      const pMissables = p.zones.flatMap((z: any) => z.steps).filter((s: any) => s.type === 'missable').length;
                      return (
                        <button key={i} onClick={() => setActivePlaythrough(i)} style={{ padding: '0.45rem 1rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em', border: `1px solid ${activePlaythrough === i ? 'rgba(245,166,35,0.4)' : '#222'}`, background: activePlaythrough === i ? 'rgba(245,166,35,0.1)' : 'transparent', color: activePlaythrough === i ? '#f5a623' : '#444', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {p.title}
                          {pMissables > 0 && (
                            <span style={{ fontSize: '0.58rem', background: 'rgba(229,69,69,0.15)', color: '#e54545', padding: '0 5px', borderRadius: '3px', fontWeight: 800 }}>{pMissables}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {manifest.playthroughs[activePlaythrough]?.summary && (
                    <p style={{ fontSize: '0.82rem', color: '#555', margin: 0, lineHeight: 1.6, fontWeight: 300, borderLeft: '2px solid #2a2a2a', paddingLeft: '0.85rem' }}>
                      {manifest.playthroughs[activePlaythrough].summary}
                    </p>
                  )}
                  <Tracker session={session} manifest={manifest} playthroughIndex={activePlaythrough} mode="partida" spoilerMode={spoilerMode} searchQuery={stepSearch} />
                </div>
              )}

              {guideMode === 'pasos' && (
                <Tracker session={session} manifest={manifest} playthroughIndex={0} mode="all" spoilerMode={spoilerMode} searchQuery={stepSearch} />
              )}
            </div>
          ) : (
            <EmptyState title="Guía en camino" desc={`Aún no hay una guía para ${meta.name}. Añade un manifest JSON.`} />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#0d0d0d', border: '1px dashed #1e1e1e', borderRadius: '12px' }}>
      <p style={{ color: '#f0ece4', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.4rem' }}>{title}</p>
      <p style={{ color: '#333', fontSize: '0.8rem', maxWidth: '300px', margin: '0 auto', lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}
