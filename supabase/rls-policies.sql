-- Ejecutar en el SQL Editor de Supabase DESPUÉS de aplicar las migraciones de Prisma.
-- Defensa en profundidad: Prisma se conecta directamente a Postgres (no vía
-- PostgREST) así que estas políticas no son el mecanismo real de control de
-- acceso de la app (eso lo hace el proxy.ts + requireSession() en cada
-- Server Action). Esto solo protege por si en el futuro alguna tabla se
-- consulta directamente desde el cliente con supabase-js.

alter table "Cliente" enable row level security;
alter table "Contacto" enable row level security;
alter table "Inmueble" enable row level security;
alter table "Interes" enable row level security;
alter table "Operacion" enable row level security;
alter table "Archivo" enable row level security;
alter table "Bloque" enable row level security;
-- Prisma's migration history: no policy on purpose, so the public API can't
-- read or write it. Prisma connects as the table owner and is not affected.
alter table "_prisma_migrations" enable row level security;

create policy "cliente_authenticated_all" on "Cliente" for all to authenticated using (true) with check (true);
create policy "contacto_authenticated_all" on "Contacto" for all to authenticated using (true) with check (true);
create policy "inmueble_authenticated_all" on "Inmueble" for all to authenticated using (true) with check (true);
create policy "interes_authenticated_all" on "Interes" for all to authenticated using (true) with check (true);
create policy "operacion_authenticated_all" on "Operacion" for all to authenticated using (true) with check (true);
create policy "archivo_authenticated_all" on "Archivo" for all to authenticated using (true) with check (true);
create policy "bloque_authenticated_all" on "Bloque" for all to authenticated using (true) with check (true);
