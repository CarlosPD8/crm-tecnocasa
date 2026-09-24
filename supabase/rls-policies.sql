-- Ejecutar en el SQL Editor de Supabase DESPUÉS de aplicar las migraciones de Prisma.
--
-- El CRM accede a los datos solo desde el servidor, con Prisma conectado como
-- propietario de las tablas (no le afecta RLS). La API REST de Supabase
-- (PostgREST) no se usa, así que se cierra por completo: RLS activado, ninguna
-- política y ningún permiso para los roles públicos. Con la clave pública
-- (anon) y cualquier sesión, las tablas son inaccesibles.
--
-- El aislamiento entre oficinas lo hacen la aplicación (lib/db.ts) y los
-- triggers crm_misma_oficina de las migraciones, no estas políticas.

alter table "Cliente" enable row level security;
alter table "Contacto" enable row level security;
alter table "Inmueble" enable row level security;
alter table "Interes" enable row level security;
alter table "Operacion" enable row level security;
alter table "Archivo" enable row level security;
alter table "Bloque" enable row level security;
alter table "Evento" enable row level security;
alter table "Oficina" enable row level security;
alter table "Usuario" enable row level security;
alter table "_prisma_migrations" enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;
