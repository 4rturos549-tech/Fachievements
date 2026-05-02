import type { APIRoute } from 'astro';
import { getFeaturedGames } from '../../lib/igdb';

export const GET: APIRoute = async () => {
  try {
    const results = await getFeaturedGames();
    return Response.json(results, {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  } catch (error) {
    console.error('[api/featured]', error);
    return Response.json({ error: 'No se pudieron cargar destacados' }, { status: 502 });
  }
};
