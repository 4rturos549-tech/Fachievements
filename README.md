# Fachievements

Guías paso a paso para conseguir todos los trofeos y logros de tus juegos favoritos.
Construido con Astro + React + Supabase, integrando metadata de juegos vía IGDB (Twitch API).

## Stack

- **Astro 6** (SSR, adapter Vercel)
- **React 19** para componentes interactivos
- **Tailwind v4** para estilos
- **Supabase** para auth y persistencia de progreso/guías
- **IGDB / Twitch API** para metadata (carátulas, sinopsis, ratings)

## Estructura

```
src/
├─ components/   Componentes React (Auth, Profile, GameView, Tracker, SearchBar, App)
├─ layouts/      Layout base con SEO
├─ lib/          igdb.ts, supabase.ts, types.ts, admin-auth.ts
├─ pages/
│  ├─ index.astro          Home con buscador + destacados
│  ├─ perfil.astro         Perfil del usuario (auth Supabase)
│  ├─ admin.astro          Panel para subir guías (cookie httpOnly)
│  ├─ 404.astro
│  ├─ guias/[id].astro     Página dinámica por igdb_id
│  └─ api/
│     ├─ search.ts
│     ├─ featured.ts
│     └─ admin/{login,upload-guide,list-guides}.ts
└─ styles/global.css
```

## Variables de entorno

Copia `.env.example` a `.env` y rellena:

| Variable | Tipo | Para qué |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | cliente | URL de tu proyecto Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | cliente | Anon key (segura para exponer) |
| `SUPABASE_SERVICE_ROLE_KEY` | servidor | (opcional) bypass RLS al subir guías |
| `TWITCH_CLIENT_ID` | servidor | Client ID de tu app Twitch |
| `TWITCH_CLIENT_SECRET` | servidor | **secreto**, nunca con prefijo PUBLIC_ |
| `ADMIN_PASSWORD` | servidor | Contraseña del panel `/admin` |

> ⚠️ **Nunca commitear `.env`**. Si filtras el `TWITCH_CLIENT_SECRET`, rótalo en https://dev.twitch.tv/console.

## Setup local

```bash
pnpm install
cp .env.example .env   # rellénalo
pnpm dev               # http://localhost:4321
```

## Comandos

| Comando | Acción |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm preview` | Preview del build |

## Schema de Supabase

Tablas mínimas necesarias:

```sql
create table game_guides (
  igdb_id text primary key,
  manifest jsonb not null,
  title text generated always as (manifest->>'title') stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table completed_steps (
  user_id uuid references auth.users(id) on delete cascade,
  step_id text not null,
  igdb_id text,
  created_at timestamptz default now(),
  primary key (user_id, step_id)
);

-- RLS recomendado
alter table completed_steps enable row level security;
create policy "users manage own steps" on completed_steps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table game_guides enable row level security;
create policy "anyone can read guides" on game_guides for select using (true);
-- Las escrituras pasan por /api/admin/upload-guide con la service role key
```

## Schema del manifest de guía

```jsonc
{
  "igdb_id": "19562",
  "title": "Resident Evil 7",
  "info": {
    "difficulty": "5/10",
    "estimated_time": "30h",
    "min_playthroughs": 2,
    "total_trophies": 31,
    "missable_warning": "Aviso opcional sobre perdibles",
    "tip": "Consejo opcional"
  },
  "achievements": [
    { "id": "ach-1", "type": "platinum", "title": "...", "description": "...", "missable": false }
  ],
  "playthroughs": [
    {
      "title": "Partida 1 — Normal",
      "summary": "Resumen opcional",
      "zones": [
        {
          "name": "Mansión",
          "steps": [
            { "id": "s-1", "type": "missable", "description": "..." },
            { "id": "s-2", "type": "collectible", "description": "..." },
            { "id": "s-3", "type": "tip", "description": "..." }
          ]
        }
      ]
    }
  ]
}
```

Tipos de step: `missable | collectible | tip | main`. Tipos de logro: `platinum | gold | silver | bronze`.

## Subir una guía

1. Ve a `/admin` y entra con tu `ADMIN_PASSWORD`.
2. Pega el JSON del manifest, escribe el `igdb_id` (numérico) y pulsa "Subir a Supabase".
3. La guía queda accesible en `/guias/<igdb_id>`.

## Deploy

Configurado para Vercel con `@astrojs/vercel`. Define las variables de entorno en el dashboard de Vercel (no las commitees).
