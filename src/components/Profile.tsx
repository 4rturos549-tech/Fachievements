import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { ACCENTS, type AccentColor, type Manifest, type UserProfile } from '../lib/types';
import { computeStreaks, relativeTime } from '../lib/streak';
import { computeBadges, avatarFrame } from '../lib/badges';
import GamePicker from './GamePicker';
import type { Session } from '@supabase/supabase-js';

interface GameProgress {
  igdbId: string;
  name: string;
  completedSteps: number;
  totalSteps: number;
  percentage: number;
  coverUrl: string | null;
}

interface ActivityItem {
  step_id: string;
  igdb_id: string | null;
  created_at: string;
  description?: string;
  gameName?: string;
}

interface AchievementOption {
  step_id: string;
  description: string;
  gameName: string;
  igdb_id: string;
}

export default function Profile({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [draft, setDraft] = useState<Partial<UserProfile>>({});
  const [error, setError] = useState<string | null>(null);

  const [activeGames, setActiveGames] = useState<GameProgress[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [timestamps, setTimestamps] = useState<string[]>([]);
  const [achOptions, setAchOptions] = useState<AchievementOption[]>([]);
  const [coverIndex, setCoverIndex] = useState<Record<number, string | null>>({});
  const [nameIndex, setNameIndex] = useState<Record<number, string>>({});

  const accent = ACCENTS[(profile?.accent_color ?? 'orange') as AccentColor];
  const platinos = activeGames.filter(g => g.percentage === 100).length;
  const frame = avatarFrame(platinos);
  const streaks = useMemo(() => computeStreaks(timestamps), [timestamps]);
  const badges = useMemo(
    () => computeBadges({ totalSteps: timestamps.length, totalPlatinos: platinos, totalGames: activeGames.length, longestStreak: streaks.longest }),
    [timestamps.length, platinos, activeGames.length, streaks.longest]
  );

  // Cargar todo
  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Profile
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (cancelled) return;
      const p = (prof as UserProfile | null) ?? null;
      setProfile(p);
      setDraft(p ?? {});

      // Steps
      const { data: stepsData } = await supabase
        .from('completed_steps')
        .select('step_id, igdb_id, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (cancelled) return;
      const steps = (stepsData ?? []) as ActivityItem[];
      setTimestamps(steps.map(s => s.created_at));

      const byGame: Record<string, number> = {};
      for (const s of steps) if (s.igdb_id) byGame[s.igdb_id] = (byGame[s.igdb_id] ?? 0) + 1;
      const igdbIds = Object.keys(byGame);

      const allShownIds = new Set<number>();
      igdbIds.forEach(id => allShownIds.add(Number(id)));
      if (p?.avatar_igdb_id) allShownIds.add(p.avatar_igdb_id);
      if (p?.banner_igdb_id) allShownIds.add(p.banner_igdb_id);
      (p?.showcase_games ?? []).forEach(id => allShownIds.add(id));

      // Manifests + covers
      let games: GameProgress[] = [];
      let achOpt: AchievementOption[] = [];
      let names: Record<number, string> = {};
      let covers: Record<number, string | null> = {};

      if (igdbIds.length > 0) {
        const { data: guides } = await supabase.from('game_guides').select('igdb_id, manifest').in('igdb_id', igdbIds);
        const guidesTyped = (guides ?? []) as { igdb_id: string; manifest: Manifest }[];

        for (const g of guidesTyped) {
          names[Number(g.igdb_id)] = g.manifest.title;
          // Recolectar logros desbloqueados (steps completados que tienen unlocks)
          const stepIds = new Set(steps.filter(s => s.igdb_id === g.igdb_id).map(s => s.step_id));
          for (const p of g.manifest.playthroughs) {
            for (const z of p.zones) {
              for (const s of z.steps) {
                if (stepIds.has(s.id) && s.unlocks && s.unlocks.length > 0) {
                  for (const aId of s.unlocks) {
                    const ach = g.manifest.achievements.find(a => a.id === aId);
                    if (ach) {
                      achOpt.push({ step_id: s.id, description: ach.title, gameName: g.manifest.title, igdb_id: g.igdb_id });
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (allShownIds.size > 0) {
        try {
          const idsArr = Array.from(allShownIds);
          const res = await fetch(`/api/game-covers?ids=${idsArr.join(',')}`);
          if (res.ok) covers = await res.json();
        } catch {}
      }

      if (igdbIds.length > 0) {
        games = igdbIds.map(igdbId => {
          const numId = Number(igdbId);
          const completed = byGame[igdbId] ?? 0;
          let totalSteps = 0;
          let name = names[numId] ?? `Juego ${igdbId}`;
          // total steps necesita el manifest
          // ya está en names si hay guide
          return { igdbId, name, completedSteps: completed, totalSteps, percentage: 0, coverUrl: covers[numId] ?? null };
        });

        // Recalcular total y porcentaje a partir del manifest
        const { data: guides2 } = await supabase.from('game_guides').select('igdb_id, manifest').in('igdb_id', igdbIds);
        const guides2Typed = (guides2 ?? []) as { igdb_id: string; manifest: Manifest }[];
        games = games.map(g => {
          const guide = guides2Typed.find(x => x.igdb_id === g.igdbId);
          if (guide) {
            const total = guide.manifest.playthroughs.reduce(
              (acc, p) => acc + p.zones.reduce((z, zone) => z + zone.steps.filter(s => s.type !== 'tip').length, 0),
              0
            );
            const pct = total > 0 ? Math.min(Math.round((g.completedSteps / total) * 100), 100) : 0;
            return { ...g, name: guide.manifest.title, totalSteps: total, percentage: pct };
          }
          return g;
        });
        games.sort((a, b) => b.percentage - a.percentage);
      }

      // Activity con descripción
      const activityList: ActivityItem[] = steps.slice(0, 8).map(s => ({
        ...s,
        gameName: s.igdb_id ? names[Number(s.igdb_id)] : undefined,
      }));

      if (cancelled) return;
      setActiveGames(games);
      setActivity(activityList);
      setAchOptions(achOpt);
      setNameIndex(names);
      setCoverIndex(covers);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [session.user.id]);

  const username = profile?.display_name || profile?.handle || session.user.email?.split('@')[0] || 'Usuario';
  const avatarUrl = profile?.avatar_igdb_id ? coverIndex[profile.avatar_igdb_id] : null;
  const bannerUrl = profile?.banner_igdb_id ? coverIndex[profile.banner_igdb_id] : null;
  const initial = username.charAt(0).toUpperCase();

  const recentPlatinos = activeGames.filter(g => g.percentage === 100).slice(0, 4);
  const showcaseGames = (profile?.showcase_games ?? []).map(id => ({
    id,
    name: nameIndex[id] ?? `#${id}`,
    coverUrl: coverIndex[id] ?? null,
  }));
  const currentGame = profile?.current_game_id
    ? activeGames.find(g => g.igdbId === profile.current_game_id)
    : (activeGames.find(g => g.percentage > 0 && g.percentage < 100) ?? null);
  const favoriteAch = profile?.favorite_step_id
    ? achOptions.find(a => a.step_id === profile.favorite_step_id)
    : null;

  async function save() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      const updated = (await res.json()) as UserProfile;
      setProfile(updated);
      setDraft(updated);
      setEditing(false);
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Error al guardar');
    }
    setSaving(false);
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: '#2a2a2a', fontSize: '0.72rem', letterSpacing: '0.15em', fontFamily: "'DM Mono',monospace" }}>
      Cargando perfil...
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* HEADER con banner */}
      <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: `1px solid ${accent.hex}22`, background: '#0a0a0a', minHeight: '180px' }}>
        {bannerUrl ? (
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
            <img src={bannerUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(2px) saturate(0.85)', transform: 'scale(1.05)' }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.5) 50%, rgba(10,10,10,0.85) 100%)` }} />
          </div>
        ) : activeGames.length > 0 ? (
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', opacity: 0.18, filter: 'blur(8px) saturate(0.6)' }}>
            {activeGames.slice(0, 6).map(g => (
              g.coverUrl ? <img key={g.igdbId} src={g.coverUrl} alt="" style={{ flex: 1, width: 0, height: '100%', objectFit: 'cover' }} /> : null
            ))}
          </div>
        ) : null}

        {!bannerUrl && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.7) 60%, rgba(10,10,10,0.95) 100%)' }} />}

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', flexWrap: 'wrap' }}>
          {/* Avatar con marco según platinos */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: '78px', height: '78px', background: avatarUrl ? '#000' : `linear-gradient(135deg, ${accent.soft}, transparent)`, border: `2px solid ${frame ? frame.color : accent.hex}55`, borderRadius: '14px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '2.4rem', color: accent.hex, boxShadow: frame ? `0 0 22px ${frame.color}44` : 'none' }}>
              {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
            </div>
            {frame && (
              <span style={{ position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%)', background: '#080808', border: `1px solid ${frame.color}`, color: frame.color, fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                {frame.label}
              </span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: '180px' }}>
            <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', letterSpacing: '0.18em', color: accent.hex, textTransform: 'uppercase', margin: '0 0 4px' }}>
              {platinos > 0 ? `Cazador · ${platinos} platino${platinos === 1 ? '' : 's'}` : 'Cazador Activo'}
              {streaks.current > 0 && <span style={{ color: '#666', marginLeft: '0.5rem' }}>· racha {streaks.current}d</span>}
            </p>
            <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.7rem', letterSpacing: '0.06em', color: '#f0ece4', margin: 0, lineHeight: 1 }}>{username}</p>
            <p style={{ fontSize: '0.7rem', color: '#444', margin: '4px 0 0', fontFamily: "'DM Mono',monospace" }}>
              @{profile?.handle ?? '—'}
            </p>
            {profile?.bio && !editing && (
              <p style={{ fontSize: '0.82rem', color: '#888', margin: '0.6rem 0 0', maxWidth: '500px', lineHeight: 1.55 }}>{profile.bio}</p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            {!editing && profile && (
              <button
                onClick={() => setEditing(true)}
                style={{ background: accent.soft, border: `1px solid ${accent.hex}44`, color: accent.hex, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.5rem 0.9rem', borderRadius: '6px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
              >
                Editar perfil
              </button>
            )}
            {!editing && profile?.handle && (
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/u/${profile.handle}`).catch(() => {})}
                style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#666', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.5rem 0.85rem', borderRadius: '6px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
              >
                Compartir
              </button>
            )}
            <button
              onClick={() => supabase.auth.signOut()}
              style={{ background: 'transparent', border: '1px solid #1e1e1e', color: '#444', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.5rem 0.85rem', borderRadius: '6px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* EDITOR */}
      {editing && profile && (
        <div style={{ background: '#0a0a0a', border: `1px solid ${accent.hex}33`, borderRadius: '14px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', letterSpacing: '0.18em', color: accent.hex, textTransform: 'uppercase', margin: 0 }}>Editar perfil</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Handle (URL pública)">
              <input
                type="text"
                value={draft.handle ?? ''}
                onChange={e => setDraft(d => ({ ...d, handle: e.target.value.toLowerCase() }))}
                placeholder="solo_a-z_0-9"
                style={inputStyle}
              />
            </Field>
            <Field label="Nombre visible">
              <input
                type="text"
                value={draft.display_name ?? ''}
                onChange={e => setDraft(d => ({ ...d, display_name: e.target.value }))}
                placeholder="Tu alias"
                maxLength={40}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label={`Bio (${(draft.bio ?? '').length}/200)`}>
            <textarea
              value={draft.bio ?? ''}
              onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))}
              maxLength={200}
              rows={2}
              placeholder="Cuéntale al mundo qué juegos te van"
              style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: "'DM Sans',sans-serif" }}
            />
          </Field>

          <Field label="Color de acento">
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(Object.keys(ACCENTS) as AccentColor[]).map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDraft(d => ({ ...d, accent_color: k }))}
                  title={ACCENTS[k].label}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', border: draft.accent_color === k ? `2px solid ${ACCENTS[k].hex}` : '2px solid #1e1e1e', background: ACCENTS[k].hex, cursor: 'pointer', boxShadow: draft.accent_color === k ? `0 0 0 3px ${ACCENTS[k].hex}33` : 'none', transition: 'all 0.15s' }}
                />
              ))}
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <GamePicker
              label="Avatar (carátula)"
              value={draft.avatar_igdb_id ?? null}
              onChange={(id) => setDraft(d => ({ ...d, avatar_igdb_id: id }))}
              accentHex={accent.hex}
              initialName={draft.avatar_igdb_id ? nameIndex[draft.avatar_igdb_id] : null}
              initialCover={draft.avatar_igdb_id ? coverIndex[draft.avatar_igdb_id] : null}
            />
            <GamePicker
              label="Banner (carátula)"
              value={draft.banner_igdb_id ?? null}
              onChange={(id) => setDraft(d => ({ ...d, banner_igdb_id: id }))}
              accentHex={accent.hex}
              initialName={draft.banner_igdb_id ? nameIndex[draft.banner_igdb_id] : null}
              initialCover={draft.banner_igdb_id ? coverIndex[draft.banner_igdb_id] : null}
            />
          </div>

          <Field label="Juego actual ('en este momento')">
            <select
              value={draft.current_game_id ?? ''}
              onChange={e => setDraft(d => ({ ...d, current_game_id: e.target.value || null }))}
              style={inputStyle}
            >
              <option value="">— auto (el de menor avance &gt; 0) —</option>
              {activeGames.filter(g => g.percentage < 100).map(g => (
                <option key={g.igdbId} value={g.igdbId}>{g.name} · {g.percentage}%</option>
              ))}
            </select>
          </Field>

          <Field label="Logro favorito">
            <select
              value={draft.favorite_step_id ?? ''}
              onChange={e => setDraft(d => ({ ...d, favorite_step_id: e.target.value || null }))}
              style={inputStyle}
            >
              <option value="">— ninguno —</option>
              {achOptions.map(a => (
                <option key={a.step_id} value={a.step_id}>{a.description} · {a.gameName}</option>
              ))}
            </select>
          </Field>

          <Field label="Showcase de juegos (hasta 4)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[0, 1, 2, 3].map(idx => {
                const ids = draft.showcase_games ?? [];
                const id = ids[idx] ?? null;
                return (
                  <GamePicker
                    key={idx}
                    label={`Slot ${idx + 1}`}
                    value={id}
                    onChange={(newId) => {
                      const next = [...(draft.showcase_games ?? [])];
                      if (newId === null) next.splice(idx, 1);
                      else next[idx] = newId;
                      setDraft(d => ({ ...d, showcase_games: next.filter((n): n is number => Number.isInteger(n)) }));
                    }}
                    accentHex={accent.hex}
                    initialName={id ? nameIndex[id] : null}
                    initialCover={id ? coverIndex[id] : null}
                  />
                );
              })}
            </div>
          </Field>

          {error && <p style={{ color: '#e54545', fontSize: '0.78rem', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => { setEditing(false); setDraft(profile); setError(null); }}
              style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#666', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.6rem 1rem', borderRadius: '7px', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{ background: accent.hex, border: 'none', color: '#000', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.6rem 1.2rem', borderRadius: '7px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* SHOWCASES */}
      {!editing && (currentGame || favoriteAch || showcaseGames.length > 0 || recentPlatinos.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {currentGame && (
            <ShowcaseCard accent={accent} label="En este momento">
              <a href={`/guias/${currentGame.igdbId}`} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', textDecoration: 'none' }}>
                {currentGame.coverUrl && <img src={currentGame.coverUrl} alt="" style={{ width: '54px', height: '74px', objectFit: 'cover', borderRadius: '4px' }} />}
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#f0ece4', fontWeight: 600, fontSize: '0.88rem', margin: '0 0 4px' }}>{currentGame.name}</p>
                  <div style={{ background: '#1a1a1a', height: '3px', borderRadius: '99px', overflow: 'hidden', marginBottom: '4px' }}>
                    <div style={{ width: `${currentGame.percentage}%`, height: '100%', background: accent.hex }} />
                  </div>
                  <p style={{ color: accent.hex, fontFamily: "'DM Mono',monospace", fontSize: '0.7rem', margin: 0 }}>{currentGame.percentage}% · {currentGame.completedSteps}/{currentGame.totalSteps}</p>
                </div>
              </a>
            </ShowcaseCard>
          )}

          {favoriteAch && (
            <ShowcaseCard accent={accent} label="Logro favorito">
              <a href={`/guias/${favoriteAch.igdb_id}`} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', textDecoration: 'none' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: accent.soft, border: `1px solid ${accent.hex}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent.hex, fontSize: '1.2rem' }}>★</div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#f0ece4', fontWeight: 600, fontSize: '0.85rem', margin: '0 0 2px' }}>{favoriteAch.description}</p>
                  <p style={{ color: '#555', fontSize: '0.7rem', margin: 0 }}>{favoriteAch.gameName}</p>
                </div>
              </a>
            </ShowcaseCard>
          )}

          {recentPlatinos.length > 0 && (
            <ShowcaseCard accent={accent} label="Platinos recientes" wide>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                {recentPlatinos.map(g => (
                  <a key={g.igdbId} href={`/guias/${g.igdbId}`} title={g.name} style={{ aspectRatio: '3/4', borderRadius: '5px', overflow: 'hidden', background: '#0d0d0d' }}>
                    {g.coverUrl ? <img src={g.coverUrl} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                  </a>
                ))}
              </div>
            </ShowcaseCard>
          )}

          {showcaseGames.length > 0 && (
            <ShowcaseCard accent={accent} label="Juegos destacados" wide>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(showcaseGames.length, 2)}, 1fr)`, gap: '0.5rem' }}>
                {showcaseGames.map(g => (
                  <a key={g.id} href={`/guias/${g.id}`} title={g.name} style={{ aspectRatio: '3/4', borderRadius: '5px', overflow: 'hidden', background: '#0d0d0d' }}>
                    {g.coverUrl ? <img src={g.coverUrl} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                  </a>
                ))}
              </div>
            </ShowcaseCard>
          )}
        </div>
      )}

      {/* STATS */}
      <div>
        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', letterSpacing: '0.18em', color: '#333', textTransform: 'uppercase', marginBottom: '0.85rem' }}>Estadísticas</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
          <StatCard value={timestamps.length} label={'Pasos\ncompletados'} color={accent.hex} />
          <StatCard value={activeGames.length} label={'Juegos\nen progreso'} color="#4a9eff" />
          <StatCard value={platinos} label={'Platinos\nobtenidos'} color="#e8d5ff" />
          <StatCard value={streaks.longest} label={'Racha\nmás larga (días)'} color="#4ade80" />
        </div>
      </div>

      {/* BADGES */}
      <div>
        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', letterSpacing: '0.18em', color: '#333', textTransform: 'uppercase', marginBottom: '0.85rem' }}>Insignias</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
          {badges.map(b => (
            <div key={b.id} title={b.description} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: '#0a0a0a', border: `1px solid ${b.unlocked ? accent.hex + '44' : '#141414'}`, borderRadius: '8px', padding: '0.7rem 0.9rem', opacity: b.unlocked ? 1 : 0.4 }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: b.unlocked ? accent.soft : '#0d0d0d', border: `1px solid ${b.unlocked ? accent.hex + '66' : '#1a1a1a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: b.unlocked ? accent.hex : '#333', fontSize: '0.85rem', flexShrink: 0 }}>
                {b.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: b.unlocked ? '#f0ece4' : '#444', fontSize: '0.78rem', fontWeight: 600, margin: 0 }}>{b.title}</p>
                <p style={{ color: '#444', fontSize: '0.66rem', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ACTIVITY */}
      {activity.length > 0 && (
        <div>
          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', letterSpacing: '0.18em', color: '#333', textTransform: 'uppercase', marginBottom: '0.85rem' }}>Actividad reciente</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {activity.map(a => (
              <div key={a.step_id + a.created_at} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: '#0a0a0a', border: '1px solid #141414', borderRadius: '7px', padding: '0.6rem 0.9rem' }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: accent.hex, flexShrink: 0 }} />
                <p style={{ flex: 1, fontSize: '0.78rem', color: '#aaa', margin: 0 }}>
                  Paso completado en <strong style={{ color: '#f0ece4' }}>{a.gameName ?? 'un juego'}</strong>
                </p>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', color: '#444' }}>{relativeTime(a.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JUEGOS EN PROGRESO */}
      <div>
        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', letterSpacing: '0.18em', color: '#333', textTransform: 'uppercase', marginBottom: '0.85rem' }}>En progreso</p>
        {activeGames.length === 0 ? (
          <div style={{ background: '#0a0a0a', border: '1px dashed #1a1a1a', borderRadius: '10px', padding: '2.5rem 2rem', textAlign: 'center' }}>
            <p style={{ color: '#666', fontSize: '0.95rem', margin: '0 0 0.4rem', fontWeight: 500 }}>Tu colección está vacía</p>
            <p style={{ color: '#333', fontSize: '0.78rem', margin: 0, maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>Busca un juego, marca pasos a medida que los consigues, y este perfil se llenará con tus carátulas y progreso.</p>
            <a href="/" style={{ display: 'inline-block', marginTop: '1.25rem', background: accent.hex, color: '#000', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px' }}>Buscar un juego →</a>
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
                  {game.coverUrl ? <img src={game.coverUrl} alt={game.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#222', fontSize: '0.6rem' }}>—</div>}
                  {game.percentage === 100 && (
                    <div style={{ position: 'absolute', top: '6px', right: '6px', background: accent.hex, borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${accent.hex}88` }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, padding: '1rem 1.25rem', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: '#f0ece4', fontSize: '0.88rem', fontWeight: 600, margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{game.name}</p>
                      <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: '#333', margin: 0 }}>{game.completedSteps} / {game.totalSteps > 0 ? game.totalSteps : '?'} pasos</p>
                    </div>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.4rem', color: game.percentage === 100 ? accent.hex : '#f0ece4', letterSpacing: '0.05em', lineHeight: 1, flexShrink: 0 }}>{game.percentage}%</span>
                  </div>
                  <div style={{ background: '#141414', borderRadius: '99px', height: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${game.percentage}%`, background: game.percentage === 100 ? `linear-gradient(90deg, ${accent.hex}aa, ${accent.hex})` : '#2a2a2a', borderRadius: '99px', transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0d0d0d',
  border: '1px solid #2a2a2a',
  borderRadius: '7px',
  color: '#f0ece4',
  fontFamily: "'DM Mono',monospace",
  fontSize: '0.85rem',
  padding: '0.55rem 0.75rem',
  outline: 'none',
  boxSizing: 'border-box',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', marginBottom: '0.4rem', fontFamily: "'DM Sans',sans-serif" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ background: '#0a0a0a', border: '1px solid #141414', borderRadius: '10px', padding: '1.1rem 0.75rem', textAlign: 'center' }}>
      <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2.2rem', color, margin: 0, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: '0.6rem', color: '#333', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '5px', whiteSpace: 'pre-line', lineHeight: 1.4 }}>{label}</p>
    </div>
  );
}

function ShowcaseCard({ accent, label, children, wide }: { accent: typeof ACCENTS[AccentColor]; label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ background: '#0a0a0a', border: '1px solid #141414', borderRadius: '10px', padding: '1rem', gridColumn: wide ? 'span 2' : 'auto' }}>
      <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', letterSpacing: '0.18em', color: accent.hex, textTransform: 'uppercase', margin: '0 0 0.7rem' }}>{label}</p>
      {children}
    </div>
  );
}
