// Este archivo SOLO se ejecuta en el servidor (Astro SSR).
// Nunca lo importes desde un componente React client-side.

async function getTwitchToken(): Promise<string> {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${import.meta.env.TWITCH_CLIENT_ID}&client_secret=${import.meta.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  );

  if (!res.ok) {
    throw new Error(`Error obteniendo token de Twitch: ${res.status}`);
  }

  const { access_token } = await res.json();
  return access_token;
}

export async function getGameMetadata(igdbId: string) {
  try {
    const access_token = await getTwitchToken();

    const res = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': import.meta.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json',
      },
      body: `fields name, summary, cover.image_id, first_release_date, platforms.name, screenshots.image_id, total_rating; where id = ${igdbId};`
    });

    if (!res.ok) {
      throw new Error(`Error en IGDB: ${res.status}`);
    }

    const data = await res.json();

    if (!data || data.length === 0) return null;

    const game = data[0];

    return {
      name: game.name as string,
      summary: (game.summary as string) || null,
      coverUrl: game.cover
        ? `https://images.igdb.com/igdb/image/upload/t_1080p/${game.cover.image_id}.jpg`
        : null,
      rating: game.total_rating ? Math.round(game.total_rating) : null,
      releaseDate: game.first_release_date
        ? new Date(game.first_release_date * 1000).getFullYear()
        : 'N/A',
      platforms: game.platforms
        ? game.platforms.map((p: any) => p.name).join(', ')
        : 'Múltiples plataformas',
      screenshots: game.screenshots
        ? game.screenshots.map((s: any) =>
            `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${s.image_id}.jpg`
          )
        : [],
    };
  } catch (error) {
    console.error('Error en getGameMetadata:', error);
    return null;
  }
}
