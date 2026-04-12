import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');

  if (!query || query.length < 3) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Obtener Token de Twitch
    const tokenRes = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${import.meta.env.TWITCH_CLIENT_ID}&client_secret=${import.meta.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
      { method: 'POST' }
    );

    if (!tokenRes.ok) {
      throw new Error('No se pudo obtener el token de Twitch');
    }

    const { access_token } = await tokenRes.json();

    // 2. Buscar en IGDB
    const igdbRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': import.meta.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json',
      },
      body: `search "${query}"; fields name, cover.image_id; limit 12;`,
    });

    if (!igdbRes.ok) {
      throw new Error('Error al consultar IGDB');
    }

    const games = await igdbRes.json();

    // 3. Formatear respuesta
    const results = games.map((g: any) => ({
      id: g.id,
      name: g.name,
      coverUrl: g.cover
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
        : null,
    }));

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en /api/search:', error);
    return new Response(JSON.stringify({ error: 'Fallo en la búsqueda' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
