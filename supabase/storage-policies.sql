-- Ejecutar en el SQL Editor de Supabase (Project > SQL Editor).
-- Crea los dos buckets de Storage. No lleva políticas: a propósito.
--
-- Todo acceso a Storage lo hace el servidor con la service role key
-- (lib/supabase/storage.ts), después de comprobar que el archivo es de la
-- oficina del usuario. Las rutas son `<oficinaId>/<cliente|inmueble>/<uuid>-<nombre>`.
-- Sin políticas, la anon key y las sesiones de usuario no pueden listar,
-- subir, leer ni borrar nada por la API de Storage.

-- Bucket público: solo fotos de inmuebles. Las URLs públicas
-- (/storage/v1/object/public/...) funcionan sin política; no se pueden listar.
insert into storage.buckets (id, name, public)
values ('inmuebles-fotos', 'inmuebles-fotos', true)
on conflict (id) do nothing;

-- Bucket privado: documentos de clientes e inmuebles, servidos con URLs
-- firmadas de 5 minutos que genera el servidor.
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

-- Si se venía de la versión anterior (antes de las oficinas):
drop policy if exists "fotos_public_read" on storage.objects;
drop policy if exists "fotos_auth_write" on storage.objects;
drop policy if exists "fotos_auth_update" on storage.objects;
drop policy if exists "fotos_auth_delete" on storage.objects;
drop policy if exists "documentos_auth_all" on storage.objects;
