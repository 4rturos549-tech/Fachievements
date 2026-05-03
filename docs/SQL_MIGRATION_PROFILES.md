# Migración SQL — Perfiles personalizables

Ejecuta este bloque en **Supabase → SQL Editor → New query → Run**.
Es seguro de re-ejecutar (idempotente) y repara handles inválidos de ejecuciones previas antes de añadir la constraint.

```sql
-- =========================================================
-- Tabla profiles
-- =========================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,
  display_name text,
  bio text,
  accent_color text default 'orange' check (accent_color in ('orange','blue','purple','green','red','white','gold')),
  avatar_igdb_id integer,
  banner_igdb_id integer,
  favorite_step_id text,
  current_game_id text,
  showcase_games integer[] default '{}'::integer[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_handle on profiles (lower(handle));

-- =========================================================
-- Helper: genera un handle válido (3–24, [a-z0-9_]) determinístico
-- =========================================================
create or replace function public.fach_make_handle(email text, uid uuid)
returns text language plpgsql immutable as $$
declare
  base text;
  suffix text;
  candidate text;
begin
  base := lower(regexp_replace(coalesce(split_part(email, '@', 1), 'user'), '[^a-z0-9_]', '', 'g'));
  if base = '' or base is null then base := 'user'; end if;
  -- 8 primeros chars hex del uuid (sin guiones)
  suffix := substring(replace(uid::text, '-', '') from 1 for 8);
  candidate := substring(base from 1 for 14) || suffix;  -- máx 14 + 8 = 22 chars
  -- garantizar mínimo 3 chars (siempre 11 en realidad por el suffix de 8)
  if length(candidate) < 3 then candidate := candidate || '___'; end if;
  return candidate;
end;
$$;

-- =========================================================
-- Trigger: crea fila de profile al registrarse
-- =========================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_handle text;
  unique_handle text;
  suffix int := 0;
begin
  base_handle := public.fach_make_handle(new.email, new.id);
  unique_handle := base_handle;
  while exists (select 1 from profiles where handle = unique_handle) loop
    suffix := suffix + 1;
    unique_handle := substring(base_handle from 1 for 22) || suffix::text;
  end loop;

  insert into profiles (id, handle, display_name)
  values (new.id, unique_handle, lower(regexp_replace(coalesce(split_part(new.email, '@', 1), 'user'), '[^a-z0-9_]', '', 'g')))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- Reparar/insertar perfiles para usuarios existentes
-- =========================================================
-- 1) Insertar perfiles que falten
insert into profiles (id, handle, display_name)
select
  u.id,
  public.fach_make_handle(u.email, u.id),
  lower(regexp_replace(coalesce(split_part(u.email, '@', 1), 'user'), '[^a-z0-9_]', '', 'g'))
from auth.users u
on conflict (id) do nothing;

-- 2) Reescribir cualquier handle que viole la regla
update profiles p
set handle = public.fach_make_handle(u.email, u.id)
from auth.users u
where p.id = u.id
  and (p.handle is null or p.handle !~ '^[a-z0-9_]{3,24}$');

-- =========================================================
-- updated_at automático
-- =========================================================
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists profiles_touch on profiles;
create trigger profiles_touch before update on profiles
  for each row execute function public.touch_updated_at();

-- =========================================================
-- RLS
-- =========================================================
alter table profiles enable row level security;

drop policy if exists "profiles read public"  on profiles;
drop policy if exists "profiles update self"  on profiles;
drop policy if exists "profiles insert self"  on profiles;

create policy "profiles read public" on profiles for select using (true);
create policy "profiles update self" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles insert self" on profiles for insert with check (auth.uid() = id);

-- =========================================================
-- Constraint de formato (al final, con datos ya válidos)
-- =========================================================
alter table profiles
  drop constraint if exists profiles_handle_format;
alter table profiles
  add constraint profiles_handle_format
  check (handle ~ '^[a-z0-9_]{3,24}$');
```

Después de correrlo, refresca `/perfil` y verás tu handle ya válido (algo como `tuemail12345abc`). Edítalo desde el panel para ponerle el que quieras.
