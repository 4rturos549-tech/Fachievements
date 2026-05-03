import type { APIRoute } from 'astro';
import { getCoversByIds } from '../../lib/igdb';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const idsParam = url.searchParams.get('ids') ?? '';
  const ids = idsParam.split(',').map(s => Number(s.trim())).filter(n => Number.isInteger(n) && n > 0);

  if (ids.length === 0) {
    return Response.json({}, { status: 200 });
  }
  if (ids.length > 30) {
    return Response.json({ error: 'Máximo 30 ids' }, { status: 400 });
  }

  try {
    const covers = await getCoversByIds(ids);
    return Response.json(covers, {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=600' },
    });
  } catch (e) {
    console.error('[api/game-covers]', e);
    return Response.json({}, { status: 200 });
  }
};
