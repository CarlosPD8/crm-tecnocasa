-- Ejecutar en el SQL Editor de Supabase (Project > SQL Editor).
-- Crea los dos buckets de Storage y sus políticas de acceso.

-- Bucket público: solo fotos de inmuebles (lectura pública para next/image).
insert into storage.buckets (id, name, public)
values ('inmuebles-fotos', 'inmuebles-fotos', true)
on conflict (id) do nothing;

-- Bucket privado: documentos/contratos, tanto de clientes como de inmuebles.
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

-- Políticas para inmuebles-fotos
create policy "fotos_public_read"
  on storage.objects for select
  using (bucket_id = 'inmuebles-fotos');

create policy "fotos_auth_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'inmuebles-fotos');

create policy "fotos_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'inmuebles-fotos');

create policy "fotos_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'inmuebles-fotos');

-- Políticas para documentos (todo el acceso requiere sesión; lectura vía signed URL)
create policy "documentos_auth_all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'documentos')
  with check (bucket_id = 'documentos');
