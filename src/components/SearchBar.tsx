import { useState, useEffect } from 'react';

interface GameResult {
  id: number;
  name: string;
  coverUrl: string | null;
}

const S = {
  wrap: { width: '100%' } as React.CSSProperties,
  inputWrap: { position: 'relative' as const, marginBottom: '2.5rem' },
  input: {
    width: '100%',
    background: '#111',
    border: '1px solid #2a2a2a',
    borderRadius: '10px',
    color: '#f0ece4',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '1.05rem',
    fontWeight: 300,
    padding: '1rem 3rem 1rem 1.25rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '1rem',
  } as React.CSSProperties,
  card: {
    position: 'relative' as const,
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#111',
    border: '1px solid #222',
    textDecoration: 'none',
    display: 'block',
    transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
  } as React.CSSProperties,
  spinner: {
    position: 'absolute' as const,
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '18px',
    height: '18px',
    border: '2px solid #2a2a2a',
    borderTopColor: '#f5a623',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  } as React.CSSProperties,
};

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (query.length >= 3) {
        setLoading(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json();
            setResults(Array.isArray(data) ? data : []);
          }
        } catch {
          setResults([]);
        }
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 450);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div style={S.wrap}>
      <style>{`@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>

      <div style={S.inputWrap}>
        <svg style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: focused ? '#f5a623' : '#3a3a3a', transition: 'color 0.2s', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Busca un juego..."
          style={{
            ...S.input,
            paddingLeft: '2.75rem',
            borderColor: focused ? '#7a4e0d' : '#2a2a2a',
            boxShadow: focused ? '0 0 0 3px rgba(245,166,35,0.08)' : 'none',
          }}
        />
        {loading && <div style={S.spinner} />}
      </div>

      {results.length > 0 && (
        <div style={S.grid}>
          {results.map(game => (
            <a
              key={game.id}
              href={`/guias/${game.id}`}
              style={{
                ...S.card,
                borderColor: hoveredId === game.id ? '#7a4e0d' : '#222',
                transform: hoveredId === game.id ? 'translateY(-3px)' : 'none',
                boxShadow: hoveredId === game.id ? '0 12px 32px rgba(0,0,0,0.6)' : 'none',
              }}
              onMouseEnter={() => setHoveredId(game.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div style={{ aspectRatio: '3/4', overflow: 'hidden' }}>
                <img
                  src={game.coverUrl || 'https://placehold.co/300x400/111/333?text=?'}
                  alt={game.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s', transform: hoveredId === game.id ? 'scale(1.05)' : 'scale(1)' }}
                />
              </div>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)', padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <p style={{ color: '#f0ece4', fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.3, margin: 0 }}>{game.name}</p>
                {hoveredId === game.id && (
                  <p style={{ color: '#f5a623', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '4px' }}>Ver guía →</p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      {query.length >= 3 && results.length === 0 && !loading && (
        <p style={{ textAlign: 'center', color: '#333', fontSize: '0.85rem', marginTop: '2rem', fontFamily: "'DM Mono', monospace" }}>
          Sin resultados para "{query}"
        </p>
      )}
    </div>
  );
}
