import type { APIRoute } from 'astro';
import { searchGames } from '../../lib/igdb';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';

  if (query.length < 3) {
    return Response.json([], { status: 200 });
  }

  try {
    const results = await searchGames(query);
    return Response.json(results, {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch (error) {
    console.error('[api/search]', error);
    return Response.json({ error: 'Fallo en la búsqueda' }, { status: 502 });
  }
};
