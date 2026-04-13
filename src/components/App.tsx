import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Auth from './Auth';
import Profile from './Profile';
import GameView from './GameView';
import type { Session } from '@supabase/supabase-js';

interface AppProps {
  manifest?: any;
  meta?: any;
  igdbId?: string;
  view?: 'tracker' | 'profile';
}

export default function App({ manifest, meta, igdbId, view = 'tracker' }: AppProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: '#444', fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" }}>
      Sincronizando...
    </div>
  );

  if (view === 'profile') {
    return session ? <Profile session={session} /> : <Auth />;
  }

  return meta ? <GameView session={session} manifest={manifest} meta={meta} igdbId={igdbId || ''} /> : null;
}
