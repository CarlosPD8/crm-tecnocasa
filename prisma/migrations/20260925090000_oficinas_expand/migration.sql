-- Oficinas aisladas en una sola base de datos, usuarios con rol, autoría,
-- asesor responsable y fecha de fin de alquiler.
-- Paso 1 de 2 (expandir): compatible con la versión desplegada, que no conoce
-- las oficinas. Por eso:
--   * oficinaId tiene DEFAULT 'ofi_demo' (rellena las filas existentes y lo que
--     inserte la versión antigua). La migración oficinas_contract lo cambia a
--     crm_sin_oficina(), que lanza error.
--   * se conservan los únicos globales (Cliente.dni, Inmueble.referencia,
--     Bloque calle+numero+localidad) junto a los nuevos por oficina, y la
--     columna "tipoCliente" (ahora opcional), el valor VENDEDOR del enum y los
--     índices sustituidos por los compuestos. Todo eso lo borra el paso 2.

-- Funciones -------------------------------------------------------------------

-- Default de oficinaId: insertar una fila sin oficina es un error.
CREATE FUNCTION crm_sin_oficina() RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Falta oficinaId: toda fila debe pertenecer a una oficina'
    USING ERRCODE = 'not_null_violation';
END;
$$;

-- Trigger BEFORE INSERT OR UPDATE para toda tabla con oficinaId.
--   * oficinaId es inmutable.
--   * Argumentos por pares (columna, tabla): cada columna, si no es null, debe
--     apuntar a una fila de la misma oficina. En un UPDATE solo se comprueban
--     las columnas que cambian (las demás ya se comprobaron y oficinaId no
--     puede cambiar en ninguna tabla).
-- Así ninguna relación cruza oficinas, aunque la app se equivoque de id.
CREATE FUNCTION crm_misma_oficina() RETURNS TRIGGER
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
      RAISE EXCEPTION 'No se puede cambiar la oficina de %', TG_TABLE_NAME
        USING ERRCODE = 'integrity_constraint_violation';
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
        RAISE EXCEPTION '%.% apunta a un registro de otra oficina', TG_TABLE_NAME, columna
          USING ERRCODE = 'foreign_key_violation';
      END IF;
    END IF;
    i := i + 2;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION crm_sin_oficina() FROM PUBLIC;
REVOKE ALL ON FUNCTION crm_misma_oficina() FROM PUBLIC;

-- Oficinas y usuarios ---------------------------------------------------------

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('DIRECTOR', 'ASESOR');

-- CreateTable
CREATE TABLE "Oficina" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Oficina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "oficinaId" TEXT NOT NULL DEFAULT crm_sin_oficina(),
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'ASESOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "debeCambiarPassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_oficinaId_idx" ON "Usuario"("oficinaId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "Oficina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Solo el servidor (Prisma, propietario de las tablas) accede a estas tablas y
-- funciones. Los roles de la API de Supabase solo existen en Supabase.
ALTER TABLE "Oficina" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "Oficina", "Usuario" FROM anon, authenticated;
    REVOKE ALL ON FUNCTION crm_sin_oficina(), crm_misma_oficina() FROM anon, authenticated;
  END IF;
END;
$$;

-- Oficina de los datos existentes (demostración, solo del desarrollador).
INSERT INTO "Oficina" ("id", "nombre", "updatedAt") VALUES ('ofi_demo', 'Demo', CURRENT_TIMESTAMP);

-- Los usuarios que ya existen en Supabase Auth pasan a ser directores de «Demo»
-- sin obligación de cambiar la contraseña. Sin esquema auth (Postgres de
-- pruebas) no se hace nada.
DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    INSERT INTO "Usuario" ("id", "oficinaId", "nombre", "email", "rol", "debeCambiarPassword", "updatedAt")
    SELECT u.id::text, 'ofi_demo',
           COALESCE(NULLIF(u.raw_user_meta_data ->> 'nombre', ''), split_part(u.email, '@', 1)),
           lower(u.email), 'DIRECTOR', false, CURRENT_TIMESTAMP
    FROM auth.users u
    WHERE u.email IS NOT NULL;
  END IF;
END;
$$;

-- oficinaId, autoría, asesor y fin de alquiler --------------------------------

-- AlterTable
ALTER TABLE "Evento" ADD COLUMN     "creadoPorId" TEXT,
ADD COLUMN     "oficinaId" TEXT NOT NULL DEFAULT 'ofi_demo';

-- AlterTable
ALTER TABLE "Bloque" ADD COLUMN     "creadoPorId" TEXT,
ADD COLUMN     "oficinaId" TEXT NOT NULL DEFAULT 'ofi_demo';

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "asesorId" TEXT,
ADD COLUMN     "creadoPorId" TEXT,
ADD COLUMN     "oficinaId" TEXT NOT NULL DEFAULT 'ofi_demo',
ALTER COLUMN "tipoCliente" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Contacto" ADD COLUMN     "creadoPorId" TEXT,
ADD COLUMN     "oficinaId" TEXT NOT NULL DEFAULT 'ofi_demo';

-- AlterTable
ALTER TABLE "Inmueble" ADD COLUMN     "asesorId" TEXT,
ADD COLUMN     "creadoPorId" TEXT,
ADD COLUMN     "fechaFinAlquiler" DATE,
ADD COLUMN     "oficinaId" TEXT NOT NULL DEFAULT 'ofi_demo';

-- AlterTable
ALTER TABLE "Interes" ADD COLUMN     "oficinaId" TEXT NOT NULL DEFAULT 'ofi_demo';

-- AlterTable
ALTER TABLE "Operacion" ADD COLUMN     "creadoPorId" TEXT,
ADD COLUMN     "oficinaId" TEXT NOT NULL DEFAULT 'ofi_demo';

-- AlterTable
ALTER TABLE "Archivo" ADD COLUMN     "creadoPorId" TEXT,
ADD COLUMN     "oficinaId" TEXT NOT NULL DEFAULT 'ofi_demo';

-- CreateIndex
CREATE INDEX "Evento_oficinaId_inicio_fin_idx" ON "Evento"("oficinaId", "inicio", "fin");

-- CreateIndex
CREATE UNIQUE INDEX "Bloque_oficinaId_calle_numero_localidad_key" ON "Bloque"("oficinaId", "calle", "numero", "localidad");

-- CreateIndex
CREATE INDEX "Cliente_oficinaId_createdAt_idx" ON "Cliente"("oficinaId", "createdAt");

-- CreateIndex
CREATE INDEX "Cliente_oficinaId_asesorId_idx" ON "Cliente"("oficinaId", "asesorId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_oficinaId_dni_key" ON "Cliente"("oficinaId", "dni");

-- CreateIndex
CREATE INDEX "Contacto_oficinaId_fecha_idx" ON "Contacto"("oficinaId", "fecha");

-- CreateIndex
CREATE INDEX "Inmueble_oficinaId_createdAt_idx" ON "Inmueble"("oficinaId", "createdAt");

-- CreateIndex
CREATE INDEX "Inmueble_oficinaId_asesorId_idx" ON "Inmueble"("oficinaId", "asesorId");

-- CreateIndex
CREATE INDEX "Inmueble_oficinaId_fechaFinAlquiler_idx" ON "Inmueble"("oficinaId", "fechaFinAlquiler");

-- CreateIndex
CREATE UNIQUE INDEX "Inmueble_oficinaId_referencia_key" ON "Inmueble"("oficinaId", "referencia");

-- CreateIndex
CREATE INDEX "Interes_oficinaId_idx" ON "Interes"("oficinaId");

-- CreateIndex
CREATE INDEX "Operacion_oficinaId_fecha_idx" ON "Operacion"("oficinaId", "fecha");

-- CreateIndex
CREATE INDEX "Archivo_oficinaId_idx" ON "Archivo"("oficinaId");

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "Oficina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bloque" ADD CONSTRAINT "Bloque_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "Oficina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bloque" ADD CONSTRAINT "Bloque_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "Oficina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_asesorId_fkey" FOREIGN KEY ("asesorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contacto" ADD CONSTRAINT "Contacto_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "Oficina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contacto" ADD CONSTRAINT "Contacto_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inmueble" ADD CONSTRAINT "Inmueble_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "Oficina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inmueble" ADD CONSTRAINT "Inmueble_asesorId_fkey" FOREIGN KEY ("asesorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inmueble" ADD CONSTRAINT "Inmueble_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interes" ADD CONSTRAINT "Interes_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "Oficina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operacion" ADD CONSTRAINT "Operacion_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "Oficina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operacion" ADD CONSTRAINT "Operacion_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Archivo" ADD CONSTRAINT "Archivo_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "Oficina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Archivo" ADD CONSTRAINT "Archivo_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Triggers de aislamiento ----------------------------------------------------

CREATE TRIGGER "Usuario_misma_oficina" BEFORE INSERT OR UPDATE ON "Usuario"
  FOR EACH ROW EXECUTE FUNCTION crm_misma_oficina();

CREATE TRIGGER "Bloque_misma_oficina" BEFORE INSERT OR UPDATE ON "Bloque"
  FOR EACH ROW EXECUTE FUNCTION crm_misma_oficina('creadoPorId', 'Usuario');

CREATE TRIGGER "Cliente_misma_oficina" BEFORE INSERT OR UPDATE ON "Cliente"
  FOR EACH ROW EXECUTE FUNCTION crm_misma_oficina('asesorId', 'Usuario', 'creadoPorId', 'Usuario');

CREATE TRIGGER "Inmueble_misma_oficina" BEFORE INSERT OR UPDATE ON "Inmueble"
  FOR EACH ROW EXECUTE FUNCTION crm_misma_oficina(
    'propietarioId', 'Cliente', 'bloqueId', 'Bloque', 'asesorId', 'Usuario', 'creadoPorId', 'Usuario');

CREATE TRIGGER "Contacto_misma_oficina" BEFORE INSERT OR UPDATE ON "Contacto"
  FOR EACH ROW EXECUTE FUNCTION crm_misma_oficina(
    'clienteId', 'Cliente', 'inmuebleId', 'Inmueble', 'creadoPorId', 'Usuario');

CREATE TRIGGER "Evento_misma_oficina" BEFORE INSERT OR UPDATE ON "Evento"
  FOR EACH ROW EXECUTE FUNCTION crm_misma_oficina(
    'clienteId', 'Cliente', 'inmuebleId', 'Inmueble', 'creadoPorId', 'Usuario');

CREATE TRIGGER "Operacion_misma_oficina" BEFORE INSERT OR UPDATE ON "Operacion"
  FOR EACH ROW EXECUTE FUNCTION crm_misma_oficina(
    'clienteId', 'Cliente', 'inmuebleId', 'Inmueble', 'creadoPorId', 'Usuario');

CREATE TRIGGER "Archivo_misma_oficina" BEFORE INSERT OR UPDATE ON "Archivo"
  FOR EACH ROW EXECUTE FUNCTION crm_misma_oficina(
    'clienteId', 'Cliente', 'inmuebleId', 'Inmueble', 'creadoPorId', 'Usuario');

CREATE TRIGGER "Interes_misma_oficina" BEFORE INSERT OR UPDATE ON "Interes"
  FOR EACH ROW EXECUTE FUNCTION crm_misma_oficina('clienteId', 'Cliente', 'inmuebleId', 'Inmueble');
