-- Registro de actividad (pantalla Actividad, solo directores). Solo añade:
-- compatible con la versión desplegada, que no conoce estas tablas ni columnas.

-- CreateEnum
CREATE TYPE "AccionActividad" AS ENUM ('ENTRADA', 'ALTA', 'CAMBIO', 'BAJA', 'CONTACTO', 'OPERACION');

-- CreateEnum
CREATE TYPE "EntidadActividad" AS ENUM ('CLIENTE', 'INMUEBLE', 'BLOQUE', 'CONTACTO', 'EVENTO', 'ARCHIVO', 'INTERES', 'OPERACION', 'USUARIO');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "ultimoAcceso" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Interes" ADD COLUMN     "creadoPorId" TEXT;

-- CreateTable
CREATE TABLE "Actividad" (
    "id" TEXT NOT NULL,
    "oficinaId" TEXT NOT NULL DEFAULT crm_sin_oficina(),
    "creadoPorId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dia" DATE NOT NULL,
    "accion" "AccionActividad" NOT NULL,
    "entidad" "EntidadActividad",
    "entidadId" TEXT,
    "enlace" TEXT,
    "resumen" TEXT NOT NULL,
    "detalle" TEXT,
    "cambios" JSONB,

    CONSTRAINT "Actividad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Actividad_oficinaId_dia_idx" ON "Actividad"("oficinaId", "dia");

-- CreateIndex
CREATE INDEX "Actividad_oficinaId_creadoPorId_dia_idx" ON "Actividad"("oficinaId", "creadoPorId", "dia");

-- AddForeignKey
ALTER TABLE "Interes" ADD CONSTRAINT "Interes_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "Oficina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Aislamiento entre oficinas -------------------------------------------------

DROP TRIGGER "Interes_misma_oficina" ON "Interes";
CREATE TRIGGER "Interes_misma_oficina" BEFORE INSERT OR UPDATE ON "Interes"
  FOR EACH ROW EXECUTE FUNCTION crm_misma_oficina(
    'clienteId', 'Cliente', 'inmuebleId', 'Inmueble', 'creadoPorId', 'Usuario');

CREATE TRIGGER "Actividad_misma_oficina" BEFORE INSERT OR UPDATE ON "Actividad"
  FOR EACH ROW EXECUTE FUNCTION crm_misma_oficina('creadoPorId', 'Usuario');

-- Lo registrado no se modifica nunca. (Borrar sí se puede, fuera de la app:
-- el seed rehace la actividad de la oficina Demo.)
CREATE FUNCTION crm_actividad_inmutable() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'El registro de actividad no se puede modificar';
END;
$$;
REVOKE ALL ON FUNCTION crm_actividad_inmutable() FROM PUBLIC;

CREATE TRIGGER "Actividad_inmutable" BEFORE UPDATE ON "Actividad"
  FOR EACH ROW EXECUTE FUNCTION crm_actividad_inmutable();

-- Solo el servidor (Prisma, propietario de las tablas) accede.
ALTER TABLE "Actividad" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "Actividad" FROM anon, authenticated;
    REVOKE ALL ON FUNCTION crm_actividad_inmutable() FROM anon, authenticated;
  END IF;
END;
$$;

-- Carga inicial ----------------------------------------------------------------
-- Las altas, contactos, citas, archivos y operaciones que ya existen, con su
-- autor y su fecha. Los cambios y borrados anteriores no quedaron registrados.
-- Mismas frases que lib/actividad.ts.

INSERT INTO "Actividad" ("id", "oficinaId", "creadoPorId", "fecha", "dia", "accion", "entidad", "entidadId", "enlace", "resumen")
SELECT gen_random_uuid()::text, c."oficinaId", c."creadoPorId", c."createdAt",
       ((c."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Madrid')::date,
       'ALTA', 'CLIENTE', c."id", '/clientes/' || c."id",
       'Dio de alta a ' || c."nombre" || ' ' || c."apellidos"
FROM "Cliente" c
WHERE c."creadoPorId" IS NOT NULL;

INSERT INTO "Actividad" ("id", "oficinaId", "creadoPorId", "fecha", "dia", "accion", "entidad", "entidadId", "enlace", "resumen")
SELECT gen_random_uuid()::text, i."oficinaId", i."creadoPorId", i."createdAt",
       ((i."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Madrid')::date,
       'ALTA', 'INMUEBLE', i."id", '/inmuebles/' || i."id",
       'Dio de alta ' || i."referencia" || ' · ' || i."direccion"
FROM "Inmueble" i
WHERE i."creadoPorId" IS NOT NULL;

INSERT INTO "Actividad" ("id", "oficinaId", "creadoPorId", "fecha", "dia", "accion", "entidad", "entidadId", "enlace", "resumen")
SELECT gen_random_uuid()::text, b."oficinaId", b."creadoPorId", b."createdAt",
       ((b."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Madrid')::date,
       'ALTA', 'BLOQUE', b."id", '/bloques/' || b."id",
       'Dio de alta el bloque ' || b."calle" || ' ' || b."numero"
FROM "Bloque" b
WHERE b."creadoPorId" IS NOT NULL;

INSERT INTO "Actividad" ("id", "oficinaId", "creadoPorId", "fecha", "dia", "accion", "entidad", "entidadId", "enlace", "resumen", "detalle")
SELECT gen_random_uuid()::text, co."oficinaId", co."creadoPorId", co."fecha",
       ((co."fecha" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Madrid')::date,
       'CONTACTO', 'CONTACTO', co."id",
       COALESCE('/inmuebles/' || i."id", '/clientes/' || cl."id"),
       CASE
         WHEN cl."id" IS NOT NULL AND i."id" IS NOT NULL
           THEN 'Registró un contacto con ' || cl."nombre" || ' ' || cl."apellidos" || ' sobre ' || i."referencia"
         WHEN cl."id" IS NOT NULL THEN 'Registró un contacto con ' || cl."nombre" || ' ' || cl."apellidos"
         ELSE 'Registró un contacto sobre ' || i."referencia"
       END,
       co."nota"
FROM "Contacto" co
LEFT JOIN "Cliente" cl ON cl."id" = co."clienteId"
LEFT JOIN "Inmueble" i ON i."id" = co."inmuebleId"
WHERE co."creadoPorId" IS NOT NULL;

INSERT INTO "Actividad" ("id", "oficinaId", "creadoPorId", "fecha", "dia", "accion", "entidad", "entidadId", "enlace", "resumen")
SELECT gen_random_uuid()::text, e."oficinaId", e."creadoPorId", e."createdAt",
       ((e."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Madrid')::date,
       'ALTA', 'EVENTO', e."id", '/calendario',
       'Creó la cita «' || e."titulo" || '» · ' ||
       CASE
         WHEN e."todoElDia" THEN to_char(e."inicio", 'DD/MM/YYYY')
         ELSE to_char((e."inicio" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Madrid', 'DD/MM/YYYY HH24:MI')
       END
FROM "Evento" e
WHERE e."creadoPorId" IS NOT NULL;

INSERT INTO "Actividad" ("id", "oficinaId", "creadoPorId", "fecha", "dia", "accion", "entidad", "entidadId", "enlace", "resumen")
SELECT gen_random_uuid()::text, a."oficinaId", a."creadoPorId", a."createdAt",
       ((a."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Madrid')::date,
       'ALTA', 'ARCHIVO', a."id",
       COALESCE('/inmuebles/' || i."id", '/clientes/' || cl."id"),
       CASE
         WHEN a."categoria" = 'FOTO' THEN 'Subió una foto a ' || i."referencia"
         ELSE 'Subió el documento «' || a."nombreOriginal" || '» a ' || COALESCE(i."referencia", cl."nombre" || ' ' || cl."apellidos")
       END
FROM "Archivo" a
LEFT JOIN "Cliente" cl ON cl."id" = a."clienteId"
LEFT JOIN "Inmueble" i ON i."id" = a."inmuebleId"
WHERE a."creadoPorId" IS NOT NULL;

INSERT INTO "Actividad" ("id", "oficinaId", "creadoPorId", "fecha", "dia", "accion", "entidad", "entidadId", "enlace", "resumen", "detalle")
SELECT gen_random_uuid()::text, o."oficinaId", o."creadoPorId", o."createdAt",
       ((o."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Madrid')::date,
       'OPERACION', 'OPERACION', o."id", '/inmuebles/' || i."id",
       'Cerró ' || CASE o."tipoOperacion" WHEN 'VENTA' THEN 'la venta' ELSE 'el alquiler' END ||
       ' de ' || i."referencia" ||
       ' por ' || replace(to_char(round(o."precioFinal"), 'FM999,999,999,990'), ',', '.') || ' €' ||
       ' con ' || cl."nombre" || ' ' || cl."apellidos",
       o."notas"
FROM "Operacion" o
JOIN "Cliente" cl ON cl."id" = o."clienteId"
JOIN "Inmueble" i ON i."id" = o."inmuebleId"
WHERE o."creadoPorId" IS NOT NULL;
