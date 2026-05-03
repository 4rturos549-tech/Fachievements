import { useState, useEffect } from 'react';

interface PickedGame {
  id: number;
  name: string;
  coverUrl: string | null;
}

interface GamePickerProps {
  value: number | null;
  onChange: (id: number | null, game?: PickedGame) => void;
  label: string;
  accentHex: string;
  initialName?: string | null;
  initialCover?: string | null;
}

export default function GamePicker({ value, onChange, label, accentHex, initialName, initialCover }: GamePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickedGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<PickedGame | null>(
    value && initialName ? { id: value, name: initialName, coverUrl: initialCover ?? null } : null
  );

  useEffect(() => {
    if (!open || query.length < 3) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (res.ok) setResults(await res.json());
      } catch {} finally { setLoading(false); }
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, open]);

  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', marginBottom: '0.4rem', fontFamily: "'DM Sans',sans-serif" }}>
        {label}
      </label>

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', textAlign: 'left' }}
        >
          {current?.coverUrl ? (
            <img src={current.coverUrl} alt="" style={{ width: '38px', height: '52px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '38px', height: '52px', background: '#161616', borderRadius: '4px', flexShrink: 0 }} />
          )}
          <span style={{ flex: 1, color: current ? '#f0ece4' : '#444', fontSize: '0.85rem' }}>{current?.name || 'Elegir juego...'}</span>
          {current && (
            <span
              role="button"
              tabIndex={0}
              onClick={e => { e.stopPropagation(); setCurrent(null); onChange(null); }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setCurrent(null); onChange(null); } }}
              style={{ color: '#444', fontSize: '0.7rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
            >
              ✕
            </span>
          )}
        </button>
      )}

      {open && (
        <div style={{ background: '#0a0a0a', border: `1px solid ${accentHex}33`, borderRadius: '8px', padding: '0.6rem' }}>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar juego (3+ letras)..."
            style={{ width: '100%', background: '#080808', border: '1px solid #1e1e1e', borderRadius: '6px', color: '#f0ece4', fontSize: '0.85rem', padding: '0.55rem 0.75rem', outline: 'none', boxSizing: 'border-box', marginBottom: '0.5rem' }}
          />
          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {loading && <p style={{ color: '#444', fontSize: '0.75rem', textAlign: 'center', padding: '0.5rem 0' }}>Buscando...</p>}
            {!loading && results.length === 0 && query.length >= 3 && <p style={{ color: '#333', fontSize: '0.75rem', textAlign: 'center', padding: '0.5rem 0' }}>Sin resultados</p>}
            {results.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setCurrent(r); onChange(r.id, r); setOpen(false); setQuery(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'transparent', border: '1px solid transparent', borderRadius: '5px', padding: '0.35rem 0.5rem', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#111')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {r.coverUrl ? (
                  <img src={r.coverUrl} alt="" style={{ width: '28px', height: '38px', objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '28px', height: '38px', background: '#161616', borderRadius: '3px', flexShrink: 0 }} />
                )}
                <span style={{ color: '#f0ece4', fontSize: '0.82rem', flex: 1 }}>{r.name}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
            <button
              type="button"
              onClick={() => { setOpen(false); setQuery(''); }}
              style={{ background: 'transparent', border: '1px solid #1e1e1e', color: '#555', fontSize: '0.7rem', padding: '0.3rem 0.7rem', borderRadius: '5px', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
