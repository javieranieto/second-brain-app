-- Second Brain: la base completa. Se aplica una vez con `node herramientas/base.mjs aplicar`.
-- Se puede correr dos veces sin romper nada (todo lleva "if not exists" / "or replace" / "drop ... if exists").
--
-- Quien protege tus notas son los permisos por usuario (RLS): con la clave publica de la app,
-- cada quien solo ve lo suyo. La app nunca lleva la llave de servicio.

-- ---------------------------------------------------------------- notas
-- Lo que dictas o escribes en la app. Claude las baja al cuaderno y las marca como procesadas.
create table if not exists public.notas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  texto text not null,
  foto text,                                   -- ruta en el bucket "fotos"; la foto sola ya es una nota
  procesada boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notas_created_idx on public.notas (created_at desc);
create index if not exists notas_pendientes_idx on public.notas (created_at) where not procesada;

alter table public.notas enable row level security;
drop policy if exists notas_select_dueno on public.notas;
drop policy if exists notas_insert_dueno on public.notas;
drop policy if exists notas_update_dueno on public.notas;
drop policy if exists notas_delete_dueno on public.notas;
create policy notas_select_dueno on public.notas for select to authenticated using ((select auth.uid()) = user_id);
create policy notas_insert_dueno on public.notas for insert to authenticated with check ((select auth.uid()) = user_id);
create policy notas_update_dueno on public.notas for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy notas_delete_dueno on public.notas for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- pendientes
-- Tu lista. La ves y la palomeas en la app; Claude la llena y la ordena al procesar tus notas.
create table if not exists public.pendientes (
  id text primary key default ('p-' || replace(gen_random_uuid()::text, '-', '')),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  detalle text not null default '',
  area text not null default 'Personal',      -- tus areas de vida: Trabajo, Personal, Escuela... las que quieras
  grupo text,                                  -- el proyecto o negocio dentro del area; null = general
  esfuerzo text check (esfuerzo in ('rapido','medio','largo')),
  prioridad text not null default 'pronto' check (prioridad in ('semana','pronto','despues')),
  fecha date,
  quien text not null default 'yo' check (quien in ('yo','claude','otro')),
  quien_nombre text not null default '',
  tipo text not null default '' check (tipo in ('','revision')),
  fijado boolean not null default false,       -- entra siempre a los sugeridos de Inicio
  origen text not null default '',
  nota text not null default '',               -- la nota del cuaderno de donde salio
  comentario text not null default '',         -- lo escribes tu desde la app; Claude lo lee al procesar
  editado_en timestamptz,
  hecho boolean not null default false,
  hecho_en timestamptz,
  cerrado_por text check (cerrado_por in ('yo','claude')),
  orden int not null default 999,
  creado timestamptz not null default now()
);
create index if not exists pendientes_usuario_abiertos on public.pendientes (user_id, hecho);
create index if not exists pendientes_usuario_hecho_en on public.pendientes (user_id, hecho_en);

alter table public.pendientes enable row level security;
drop policy if exists pendientes_select_dueno on public.pendientes;
drop policy if exists pendientes_insert_dueno on public.pendientes;
drop policy if exists pendientes_update_dueno on public.pendientes;
drop policy if exists pendientes_delete_dueno on public.pendientes;
create policy pendientes_select_dueno on public.pendientes for select to authenticated using ((select auth.uid()) = user_id);
create policy pendientes_insert_dueno on public.pendientes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy pendientes_update_dueno on public.pendientes for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy pendientes_delete_dueno on public.pendientes for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- permisos
-- Solo lo que la app usa. Los proyectos nuevos de Supabase no dan los mismos permisos por defecto
-- (unos dan de mas, otros nada), asi que se dicen explicitos.
revoke all on public.notas, public.pendientes from anon, authenticated;
grant select, insert, update, delete on public.notas, public.pendientes to authenticated;

-- ---------------------------------------------------------------- fotos
-- Bucket privado. Cada quien sube y ve solo su carpeta (la primera parte de la ruta es su id).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists fotos_select_dueno on storage.objects;
drop policy if exists fotos_insert_dueno on storage.objects;
drop policy if exists fotos_delete_dueno on storage.objects;
create policy fotos_select_dueno on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy fotos_insert_dueno on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy fotos_delete_dueno on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
