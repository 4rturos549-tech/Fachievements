import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface TrackerProps {
  session: Session | null;
  manifest: any;
  playthroughIndex: number;
  mode: 'partida' | 'all';
  spoilerMode: boolean;
  searchQuery: string;
}

const STEP_STYLE: Record<string, { bg: string; border: string; color: string; label: string; icon: JSX.Element }> = {
  missable: {
    bg: 'rgba(229,69,69,0.07)', border: 'rgba(229,69,69,0.18)', color: '#e54545', label: 'Perdible',
    icon: <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  },
  collectible: {
    bg: 'rgba(74,158,255,0.07)', border: 'rgba(74,158,255,0.18)', color: '#4a9eff', label: 'Coleccionable',
    icon: <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  },
  tip: {
    bg: 'rgba(245,166,35,0.04)', border: 'rgba(245,166,35,0.1)', color: '#f5a623', label: 'Consejo',
    icon: <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  },
};

export default function Tracker({ session, manifest, playthroughIndex, mode, spoilerMode, searchQuery }: TrackerProps) {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session) { setIsLoading(false); return; }
    supabase.from('completed_steps').select('step_id').eq('user_id', session.user.id)
      .then(({ data, error }) => {
        if (!error && data) setCompletedSteps(data.map((r: any) => r.step_id));
        setIsLoading(false);
      });
  }, [session]);

  const toggleStep = async (stepId: string, type: string) => {
    if (!session || type === 'tip') return;
    const done = completedSteps.includes(stepId);
    setCompletedSteps(prev => done ? prev.filter(id => id !== stepId) : [...prev, stepId]);
    if (done) {
      await supabase.from('completed_steps').delete().match({ step_id: stepId, user_id: session.user.id });
    } else {
      await supabase.from('completed_steps').insert({ step_id: stepId, user_id: session.user.id });
    }
  };

  const allCheckable = manifest.playthroughs.flatMap((p: any) =>
    p.zones.flatMap((z: any) => z.steps.filter((s: any) => s.type !== 'tip'))
  );
  const totalSteps = allCheckable.length;
  const doneCount = completedSteps.filter(id => allCheckable.some((s: any) => s.id === id)).length;
  const progress = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0;

  // Filtrar pasos por búsqueda
  const matchesSearch = (step: any) => {
    if (!searchQuery.trim()) return true;
    return step.description.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const renderZones = (zones: any[]) => {
    const zonesWithResults = zones.map(zone => ({
      ...zone,
      filteredSteps: zone.steps.filter(matchesSearch),
    })).filter(zone => zone.filteredSteps.length > 0);

    if (zonesWithResults.length === 0 && searchQuery) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#333', fontSize: '0.8rem', fontFamily: "'DM Mono', monospace" }}>
          Sin resultados para "{searchQuery}"
        </div>
      );
    }

    return zonesWithResults.map((zone: any) => (
      <div key={zone.name} style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.2em', color: '#2a2a2a', textTransform: 'uppercase', marginBottom: '0.6rem', paddingLeft: '2px' }}>
          {zone.name}
          {searchQuery && <span style={{ color: '#444', marginLeft: '8px' }}>({zone.filteredSteps.length})</span>}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {zone.filteredSteps.map((step: any) => (
            <StepItem
              key={step.id}
              step={step}
              done={completedSteps.includes(step.id)}
              disabled={!session || step.type === 'tip'}
              onToggle={toggleStep}
              spoilerMode={spoilerMode}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      </div>
    ));
  };

  if (isLoading) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#2a2a2a', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" }}>
      Cargando...
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Progress */}
      <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
          <div>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.15em', color: '#333', textTransform: 'uppercase', margin: '0 0 2px' }}>Progreso global</p>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.6rem', color: '#2a2a2a', margin: 0 }}>{doneCount} / {totalSteps} pasos</p>
          </div>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: progress === 100 ? '#f5a623' : '#f0ece4', letterSpacing: '0.05em', lineHeight: 1 }}>{progress}%</span>
        </div>
        <div style={{ background: '#1a1a1a', borderRadius: '99px', height: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'linear-gradient(90deg, #d4891a, #f5a623)' : 'linear-gradient(90deg, #333, #555)', borderRadius: '99px', transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
        </div>
      </div>

      {/* Guest warning */}
      {!session && (
        <div style={{ background: 'rgba(245,166,35,0.04)', border: '1px solid rgba(245,166,35,0.1)', borderRadius: '8px', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p style={{ fontSize: '0.78rem', color: '#666', margin: 0 }}>
            Modo invitado — <a href="/perfil" style={{ color: '#f5a623', textDecoration: 'none', fontWeight: 600 }}>inicia sesión</a> para guardar tu progreso.
          </p>
        </div>
      )}

      {/* Steps */}
      {mode === 'all'
        ? manifest.playthroughs.map((p: any) => (
            <div key={p.title}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.1em', color: '#2a2a2a', textTransform: 'uppercase', margin: 0 }}>{p.title}</p>
                <div style={{ flex: 1, height: '1px', background: '#1a1a1a' }} />
              </div>
              {renderZones(p.zones)}
            </div>
          ))
        : renderZones(manifest.playthroughs[playthroughIndex]?.zones || [])
      }
    </div>
  );
}

function StepItem({ step, done, disabled, onToggle, spoilerMode, searchQuery }: {
  step: any; done: boolean; disabled: boolean;
  onToggle: (id: string, type: string) => void;
  spoilerMode: boolean; searchQuery: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const s = STEP_STYLE[step.type] || STEP_STYLE.tip;
  const isTip = step.type === 'tip';
  const isCheckable = !isTip && !disabled;
  const isHidden = !spoilerMode && !isTip && !done && !revealed;

  // Highlight search match
  const highlight = (text: string) => {
    if (!searchQuery.trim()) return text;
    const idx = text.toLowerCase().indexOf(searchQuery.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: 'rgba(245,166,35,0.25)', color: '#f5a623', borderRadius: '2px', padding: '0 2px' }}>
          {text.slice(idx, idx + searchQuery.length)}
        </mark>
        {text.slice(idx + searchQuery.length)}
      </>
    );
  };

  return (
    <div
      onClick={() => isCheckable && onToggle(step.id, step.type)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: done ? 'transparent' : (hovered && isCheckable ? s.bg : '#0a0a0a'),
        border: `1px solid ${done ? '#141414' : (hovered && isCheckable ? s.border : '#1a1a1a')}`,
        borderRadius: '7px',
        padding: isTip ? '0.7rem 1rem' : '0.85rem 1rem',
        display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
        cursor: isCheckable ? 'pointer' : 'default',
        opacity: done ? 0.4 : 1,
        transition: 'all 0.18s',
      }}
    >
      {isTip ? (
        <div style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '2px', color: '#f5a623', opacity: 0.5 }}>{s.icon}</div>
      ) : (
        <div style={{ width: '17px', height: '17px', borderRadius: '4px', border: `2px solid ${done ? '#f5a623' : '#2a2a2a'}`, background: done ? '#f5a623' : 'transparent', flexShrink: 0, marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s' }}>
          {done && <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#000" strokeWidth="2.5"><polyline points="1.5,6 5,9.5 10.5,2.5"/></svg>}
        </div>
      )}

      <div style={{ flex: 1 }}>
        {!isTip && (
          <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '3px', display: 'inline-flex', alignItems: 'center', gap: '3px', marginBottom: '5px', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
            {s.icon}{s.label}
          </span>
        )}

        {isHidden ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <p style={{ color: '#2a2a2a', fontSize: '0.82rem', margin: 0, fontStyle: 'italic' }}>Spoiler oculto</p>
            <button
              onClick={e => { e.stopPropagation(); setRevealed(true); }}
              style={{ fontSize: '0.62rem', color: '#f5a623', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}
            >
              Revelar
            </button>
          </div>
        ) : (
          <p style={{ color: done ? '#2a2a2a' : (isTip ? '#4a4a4a' : '#c0bcb4'), fontSize: isTip ? '0.78rem' : '0.85rem', margin: 0, lineHeight: 1.55, fontWeight: 300, textDecoration: done ? 'line-through' : 'none', fontStyle: isTip ? 'italic' : 'normal' }}>
            {highlight(step.description)}
          </p>
        )}
      </div>
    </div>
  );
}
