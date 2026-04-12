import { useState } from 'react';
import { supabase } from '../lib/supabase';

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0d0d0d',
  border: '1px solid #2a2a2a',
  borderRadius: '8px',
  color: '#f0ece4',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: '0.95rem',
  fontWeight: 300,
  padding: '0.8rem 1rem',
  outline: 'none',
};

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleAuth = async (isLogin: boolean) => {
    if (!email || !password) { setMessage('Completa todos los campos.'); setIsError(true); return; }
    setLoading(true); setMessage(''); setIsError(false);
    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) { setMessage(error.message); setIsError(true); }
    else if (!isLogin) { setMessage('Cuenta creada. Ya puedes iniciar sesión.'); setIsError(false); }
    setLoading(false);
  };

  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '2rem', maxWidth: '420px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.2em', color: '#f5a623', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Acceso</p>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.06em', color: '#f0ece4', margin: 0 }}>Tu cuenta</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: '0.4rem' }}>
            Correo
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            onKeyDown={e => e.key === 'Enter' && handleAuth(true)}
            placeholder="tu@email.com"
            disabled={loading}
            style={{ ...inputStyle, borderColor: focusedField === 'email' ? '#7a4e0d' : '#2a2a2a', boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(245,166,35,0.07)' : 'none' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: '0.4rem' }}>
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setFocusedField('pass')}
            onBlur={() => setFocusedField(null)}
            onKeyDown={e => e.key === 'Enter' && handleAuth(true)}
            placeholder="••••••••"
            disabled={loading}
            style={{ ...inputStyle, borderColor: focusedField === 'pass' ? '#7a4e0d' : '#2a2a2a', boxShadow: focusedField === 'pass' ? '0 0 0 3px rgba(245,166,35,0.07)' : 'none' }}
          />
        </div>

        {message && (
          <p style={{ fontSize: '0.8rem', color: isError ? '#e54545' : '#f5a623', margin: 0, fontFamily: "'DM Mono', monospace" }}>
            {message}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <button
            onClick={() => handleAuth(true)}
            disabled={loading}
            style={{ flex: 1, background: '#f5a623', color: '#000', fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.7rem', borderRadius: '7px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, transition: 'background 0.2s' }}
          >
            {loading ? 'Cargando...' : 'Entrar'}
          </button>
          <button
            onClick={() => handleAuth(false)}
            disabled={loading}
            style={{ flex: 1, background: 'transparent', color: '#f0ece4', fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.7rem', borderRadius: '7px', border: '1px solid #2a2a2a', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, transition: 'border-color 0.2s' }}
          >
            Registrarse
          </button>
        </div>
      </div>
    </div>
  );
}
