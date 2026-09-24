-- Oficinas: paso 2 de 2 (contraer). NO APLICAR hasta que la versión con
-- oficinas (lib/db.ts) esté desplegada en producción: la versión anterior
-- escribe "tipoCliente" e inserta sin oficinaId, y dejaría de funcionar.
-- Para aplicarla: mover esta carpeta a prisma/migrations/ y `prisma migrate deploy`.
-- A partir de aquí no se puede volver a desplegar la versión sin oficinas.

-- Únicos e índices globales sustituidos por los de la oficina (migración expand).
DROP INDEX "Cliente_dni_key";
DROP INDEX "Inmueble_referencia_key";
DROP INDEX "Bloque_calle_numero_localidad_key";
DROP INDEX "Evento_inicio_fin_idx";
DROP INDEX "Contacto_fecha_idx";
DROP INDEX "Operacion_fecha_idx";
DROP INDEX "Cliente_tipoCliente_idx";

-- Fallo cerrado: insertar sin oficina es un error, ya no cae en «Demo».
ALTER TABLE "Cliente" ALTER COLUMN "oficinaId" SET DEFAULT crm_sin_oficina();
ALTER TABLE "Inmueble" ALTER COLUMN "oficinaId" SET DEFAULT crm_sin_oficina();
ALTER TABLE "Bloque" ALTER COLUMN "oficinaId" SET DEFAULT crm_sin_oficina();
ALTER TABLE "Contacto" ALTER COLUMN "oficinaId" SET DEFAULT crm_sin_oficina();
ALTER TABLE "Evento" ALTER COLUMN "oficinaId" SET DEFAULT crm_sin_oficina();
ALTER TABLE "Interes" ALTER COLUMN "oficinaId" SET DEFAULT crm_sin_oficina();
ALTER TABLE "Operacion" ALTER COLUMN "oficinaId" SET DEFAULT crm_sin_oficina();
ALTER TABLE "Archivo" ALTER COLUMN "oficinaId" SET DEFAULT crm_sin_oficina();

-- Etiqueta única antigua (sustituida por "tipos") y el valor VENDEDOR.
ALTER TABLE "Cliente" DROP COLUMN "tipoCliente";

UPDATE "Cliente" SET "tipos" = array_remove("tipos", 'VENDEDOR') WHERE 'VENDEDOR' = ANY ("tipos");
UPDATE "Cliente" SET "tipos" = ARRAY[]::"TipoCliente"[] WHERE "tipos" IS NULL;

ALTER TABLE "Cliente" ALTER COLUMN "tipos" DROP DEFAULT;
CREATE TYPE "TipoCliente_new" AS ENUM ('COMPRADOR', 'INQUILINO', 'PROPIETARIO');
ALTER TABLE "Cliente" ALTER COLUMN "tipos" TYPE "TipoCliente_new"[] USING ("tipos"::text[]::"TipoCliente_new"[]);
ALTER TYPE "TipoCliente" RENAME TO "TipoCliente_old";
ALTER TYPE "TipoCliente_new" RENAME TO "TipoCliente";
DROP TYPE "TipoCliente_old";
ALTER TABLE "Cliente" ALTER COLUMN "tipos" SET DEFAULT ARRAY[]::"TipoCliente"[];
ALTER TABLE "Cliente" ALTER COLUMN "tipos" SET NOT NULL;

-- Mensajes legibles: con SQLSTATE de FK o NOT NULL, Prisma los sustituye por
-- «Foreign key constraint violated» sin el texto. Con el código por defecto
-- (P0001) el mensaje llega tal cual a los logs.
CREATE OR REPLACE FUNCTION crm_sin_oficina() RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Falta oficinaId: toda fila debe pertenecer a una oficina';
END;
$$;

CREATE OR REPLACE FUNCTION crm_misma_oficina() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  nueva JSONB := to_jsonb(NEW);
  vieja JSONB;
  i INT := 0;
  columna TEXT;
  tabla TEXT;
  ref TEXT;
  oficina_ref TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    vieja := to_jsonb(OLD);
    IF NEW."oficinaId" IS DISTINCT FROM OLD."oficinaId" THEN
      RAISE EXCEPTION 'No se puede cambiar la oficina de %', TG_TABLE_NAME;
    END IF;
  END IF;

  WHILE i < TG_NARGS LOOP
    columna := TG_ARGV[i];
    tabla := TG_ARGV[i + 1];
    ref := nueva ->> columna;
    IF ref IS NOT NULL AND (TG_OP = 'INSERT' OR ref IS DISTINCT FROM vieja ->> columna) THEN
      EXECUTE format('SELECT "oficinaId" FROM public.%I WHERE id = $1', tabla)
        INTO oficina_ref USING ref;
      IF oficina_ref IS DISTINCT FROM NEW."oficinaId" THEN
        RAISE EXCEPTION '%.% apunta a un registro de otra oficina', TG_TABLE_NAME, columna;
      END IF;
    END IF;
    i := i + 2;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION crm_sin_oficina() FROM PUBLIC;
REVOKE ALL ON FUNCTION crm_misma_oficina() FROM PUBLIC;

-- Storage: las políticas se borran aparte en Supabase (supabase/storage-policies.sql),
-- porque storage.objects no existe fuera de Supabase.
