import type { APIRoute } from 'astro';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');

export const GET: APIRoute = async () => {
  try {
    const clientId = env.TWITCH_CLIENT_ID;
    const clientSecret = env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const tokenRes = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST' }
    );
    const { access_token } = await tokenRes.json();

    // Traemos 100 juegos muy bien valorados y con muchos ratings (populares)
    // Luego elegimos 12 al azar del pool para que varíen cada vez
    const igdbRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json',
      },
      body: `fields name, cover.image_id, total_rating, total_rating_count;
             where total_rating > 82 & total_rating_count > 200 & cover != null & version_parent = null;
             sort total_rating_count desc;
             limit 80;`,
    });

    const games = await igdbRes.json();

    // Shuffle y tomar 12
    const shuffled = [...games].sort(() => Math.random() - 0.5).slice(0, 12);

    const results = shuffled.map((g: any) => ({
      id: g.id,
      name: g.name,
      rating: g.total_rating ? Math.round(g.total_rating) : null,
      coverUrl: g.cover
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
        : null,
    }));

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en /api/featured:', error);
    return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
};
