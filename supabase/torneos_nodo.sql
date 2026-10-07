-- =====================================================================
-- Generador de Torneos · NODO — esquema en Supabase
-- Todas las tablas/funciones llevan el prefijo torneos_nodo_
-- Idempotente: se puede volver a correr sin perder datos.
-- =====================================================================

-- ------------------------------------------------------------ usuarios habilitados
-- Solo los emails de esta tabla pueden leer/escribir (aunque haya otros usuarios
-- en Authentication, por ejemplo los jugadores del Gestor de Torneos).
create table if not exists public.torneos_nodo_usuarios (
  email  text primary key,
  creado timestamptz not null default now()
);
alter table public.torneos_nodo_usuarios enable row level security;
-- sin políticas: solo se administra desde el SQL Editor

create or replace function public.torneos_nodo_es_usuario()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.torneos_nodo_usuarios u
    where u.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;
revoke all on function public.torneos_nodo_es_usuario() from public, anon;
grant execute on function public.torneos_nodo_es_usuario() to authenticated;

-- ------------------------------------------------------------ torneos (una categoría = un torneo)
create table if not exists public.torneos_nodo_torneos (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null default '',
  premio        text not null default '',
  fecha_inicio  date,
  fecha_fin     date,
  inscripcion   integer check (inscripcion is null or inscripcion >= 0),
  observacion   text not null default '',
  cant_zonas    smallint not null default 0 check (cant_zonas between 0 and 26),
  -- primera ronda del playoff: [[{zona,pos}|null, {zona,pos}|null], ...]
  cuadro        jsonb,
  -- orden definido a mano ante empate total en una zona: {"0": [pareja_id, ...]}
  desempates    jsonb not null default '{}'::jsonb,
  creado        timestamptz not null default now(),
  actualizado   timestamptz not null default now()
);

-- ------------------------------------------------------------ formato de partido por instancia
create table if not exists public.torneos_nodo_instancias (
  torneo_id  uuid not null references public.torneos_nodo_torneos(id) on delete cascade,
  instancia  text not null check (instancia in ('zonas','16avos','octavos','cuartos','semifinal','final')),
  formato    text not null check (formato in ('mejor_de_3','mejor_de_3_stb','americano_7','americano_9')),
  primary key (torneo_id, instancia)
);

-- ------------------------------------------------------------ parejas (zona/posición = lugar en la zona)
create table if not exists public.torneos_nodo_parejas (
  id         uuid primary key default gen_random_uuid(),
  torneo_id  uuid not null references public.torneos_nodo_torneos(id) on delete cascade,
  orden      smallint not null,
  jugador1   text not null,
  jugador2   text not null,
  horario    text not null default '',
  zona       smallint check (zona is null or zona >= 0),
  posicion   smallint check (posicion is null or posicion >= 1)
);
create index if not exists torneos_nodo_parejas_torneo_idx on public.torneos_nodo_parejas (torneo_id);

-- ------------------------------------------------------------ partidos (horario + resultado)
-- clave: 'Z<zona>-<n>' (zonas, zona 0 = A) o 'P<ronda>-<orden>' (playoff, ronda 1 = primera)
create table if not exists public.torneos_nodo_partidos (
  torneo_id   uuid not null references public.torneos_nodo_torneos(id) on delete cascade,
  clave       text not null check (clave ~ '^[ZP][0-9]+-[0-9]+$'),
  instancia   text check (instancia is null or instancia in ('zonas','16avos','octavos','cuartos','semifinal','final')),
  fecha       date,
  hora        time,
  sede        text,
  pareja_a    uuid references public.torneos_nodo_parejas(id) on delete set null,
  pareja_b    uuid references public.torneos_nodo_parejas(id) on delete set null,
  sets        jsonb,                                   -- [[6,4],[3,6],[10,8]] (games de A, games de B)
  wo          text check (wo is null or wo in ('a','b')),  -- walkover: gana ese lado
  resultado   text,                                    -- "6-4 3-6 10-8" (para leer/consultar)
  ganador     uuid references public.torneos_nodo_parejas(id) on delete set null,
  actualizado timestamptz not null default now(),
  primary key (torneo_id, clave)
);

-- ------------------------------------------------------------ fecha de actualización
create or replace function public.torneos_nodo_set_actualizado()
returns trigger language plpgsql as $$
begin
  new.actualizado := now();
  return new;
end $$;

-- cualquier cambio en parejas / partidos / instancias "toca" al torneo (para ordenar la lista)
create or replace function public.torneos_nodo_tocar_torneo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.torneos_nodo_torneos set actualizado = now()
  where id = coalesce(new.torneo_id, old.torneo_id);
  return null;
end $$;

drop trigger if exists torneos_nodo_torneos_upd on public.torneos_nodo_torneos;
create trigger torneos_nodo_torneos_upd before update on public.torneos_nodo_torneos
  for each row execute function public.torneos_nodo_set_actualizado();

drop trigger if exists torneos_nodo_partidos_upd on public.torneos_nodo_partidos;
create trigger torneos_nodo_partidos_upd before update on public.torneos_nodo_partidos
  for each row execute function public.torneos_nodo_set_actualizado();

drop trigger if exists torneos_nodo_parejas_toca on public.torneos_nodo_parejas;
create trigger torneos_nodo_parejas_toca after insert or update or delete on public.torneos_nodo_parejas
  for each row execute function public.torneos_nodo_tocar_torneo();

drop trigger if exists torneos_nodo_partidos_toca on public.torneos_nodo_partidos;
create trigger torneos_nodo_partidos_toca after insert or update or delete on public.torneos_nodo_partidos
  for each row execute function public.torneos_nodo_tocar_torneo();

drop trigger if exists torneos_nodo_instancias_toca on public.torneos_nodo_instancias;
create trigger torneos_nodo_instancias_toca after insert or update or delete on public.torneos_nodo_instancias
  for each row execute function public.torneos_nodo_tocar_torneo();

-- ------------------------------------------------------------ seguridad (RLS)
do $$
declare t text;
begin
  foreach t in array array['torneos_nodo_torneos','torneos_nodo_instancias','torneos_nodo_parejas','torneos_nodo_partidos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_acceso', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.torneos_nodo_es_usuario()) with check (public.torneos_nodo_es_usuario())', t || '_acceso', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ------------------------------------------------------------ usuario de la app
-- 1) Authentication → Users → Add user → Create new user
--    Email: nodo@generador.nodo.com.ar · contraseña a elección · tildar "Auto Confirm User"
--    (en el login de la app se entra con usuario NODO y esa contraseña)
-- 2) Habilitarlo:
insert into public.torneos_nodo_usuarios (email)
values ('nodo@generador.nodo.com.ar')
on conflict do nothing;
