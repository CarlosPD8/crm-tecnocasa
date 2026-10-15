-- Zonas dentro de la oficina (punto 3). Solo añade: compatible con la versión
-- desplegada, que no conoce estas tablas ni columnas. Las columnas zonaId nacen
-- opcionales y la carga inicial las rellena; el paso de contraer
-- (prisma/pendiente/…_zonas_contract) las hace obligatorias.
--
-- 'ZONA' no se usa en esta migración: un valor nuevo de enum no se puede usar
-- en la misma transacción que lo añade.

-- AlterEnum
ALTER TYPE "EntidadActividad" ADD VALUE 'ZONA';

-- AlterTable
ALTER TABLE "Bloque" ADD COLUMN     "zonaId" TEXT;

-- AlterTable
ALTER TABLE "Inmueble" ADD COLUMN     "zonaId" TEXT;

-- CreateTable
CREATE TABLE "Zona" (
    "id" TEXT NOT NULL,
    "oficinaId" TEXT NOT NULL DEFAULT crm_sin_oficina(),
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "notas" TEXT,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZonaAsesor" (
    "oficinaId" TEXT NOT NULL DEFAULT crm_sin_oficina(),
    "zonaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "ZonaAsesor_pkey" PRIMARY KEY ("zonaId","usuarioId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Zona_oficinaId_nombre_key" ON "Zona"("oficinaId", "nombre");

-- CreateIndex
CREATE INDEX "ZonaAsesor_oficinaId_usuarioId_idx" ON "ZonaAsesor"("oficinaId", "usuarioId");

-- CreateIndex
CREATE INDEX "Bloque_oficinaId_zonaId_idx" ON "Bloque"("oficinaId", "zonaId");

-- CreateIndex
CREATE INDEX "Inmueble_oficinaId_zonaId_idx" ON "Inmueble"("oficinaId", "zonaId");

-- AddForeignKey
ALTER TABLE "Bloque" ADD CONSTRAINT "Bloque_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inmueble" ADD CONSTRAINT "Inmueble_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zona" ADD CONSTRAINT "Zona_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "Oficina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zona" ADD CONSTRAINT "Zona_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZonaAsesor" ADD CONSTRAINT "ZonaAsesor_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "Oficina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZonaAsesor" ADD CONSTRAINT "ZonaAsesor_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZonaAsesor" ADD CONSTRAINT "ZonaAsesor_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carga inicial -----------------------------------------------------------------
-- Una zona «General» por oficina con todo lo que ya existe y todos sus
-- asesores: nadie pierde acceso al desplegar. El director la reparte después.

INSERT INTO "Zona" ("id", "oficinaId", "nombre", "color", "updatedAt")
SELECT gen_random_uuid()::text, o."id", 'General', 'gris', CURRENT_TIMESTAMP
FROM "Oficina" o;

UPDATE "Bloque" b SET "zonaId" = z."id"
FROM "Zona" z
WHERE z."oficinaId" = b."oficinaId" AND z."nombre" = 'General';

UPDATE "Inmueble" i SET "zonaId" = z."id"
FROM "Zona" z
WHERE z."oficinaId" = i."oficinaId" AND z."nombre" = 'General';

INSERT INTO "ZonaAsesor" ("oficinaId", "zonaId", "usuarioId")
SELECT z."oficinaId", z."id", u."id"
FROM "Zona" z
JOIN "Usuario" u ON u."oficinaId" = z."oficinaId" AND u."rol" = 'ASESOR';

-- Zona efectiva de los pisos -----------------------------------------------------
-- Un piso de un bloque está siempre en la zona del bloque. (Por orden de nombre
-- se ejecuta antes que Inmueble_misma_oficina, que comprueba la zona resultante.)

CREATE FUNCTION crm_inmueble_hereda_zona() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW."bloqueId" IS NOT NULL THEN
    SELECT "zonaId" INTO NEW."zonaId" FROM "Bloque" WHERE "id" = NEW."bloqueId";
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Inmueble_hereda_zona" BEFORE INSERT OR UPDATE OF "bloqueId", "zonaId" ON "Inmueble"
  FOR EACH ROW EXECUTE FUNCTION crm_inmueble_hereda_zona();

-- Cambiar la zona de un bloque se la cambia a todos sus pisos.
CREATE FUNCTION crm_bloque_zona_a_pisos() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE "Inmueble" SET "zonaId" = NEW."zonaId" WHERE "bloqueId" = NEW."id";
  RETURN NULL;
END;
$$;

CREATE TRIGGER "Bloque_zona_a_pisos" AFTER UPDATE OF "zonaId" ON "Bloque"
  FOR EACH ROW WHEN (OLD."zonaId" IS DISTINCT FROM NEW."zonaId")
  EXECUTE FUNCTION crm_bloque_zona_a_pisos();

REVOKE ALL ON FUNCTION crm_inmueble_hereda_zona() FROM PUBLIC;
REVOKE ALL ON FUNCTION crm_bloque_zona_a_pisos() FROM PUBLIC;

-- Aislamiento entre oficinas -------------------------------------------------

CREATE TRIGGER "Zona_misma_oficina" BEFORE INSERT OR UPDATE ON "Zona"
  FOR EACH ROW EXECUTE FUNCTION crm_misma_oficina('creadoPorId', 'Usuario');

CREATE TRIGGER "ZonaAsesor_misma_oficina" BEFORE INSERT OR UPDATE ON "ZonaAsesor"
  FOR EACH ROW EXECUTE FUNCTION crm_misma_oficina('zonaId', 'Zona', 'usuarioId', 'Usuario');

DROP TRIGGER "Bloque_misma_oficina" ON "Bloque";
CREATE TRIGGER "Bloque_misma_oficina" BEFORE INSERT OR UPDATE ON "Bloque"
  FOR EACH ROW EXECUTE FUNCTION crm_misma_oficina('zonaId', 'Zona', 'creadoPorId', 'Usuario');

DROP TRIGGER "Inmueble_misma_oficina" ON "Inmueble";
CREATE TRIGGER "Inmueble_misma_oficina" BEFORE INSERT OR UPDATE ON "Inmueble"
  FOR EACH ROW EXECUTE FUNCTION crm_misma_oficina(
    'propietarioId', 'Cliente', 'bloqueId', 'Bloque', 'zonaId', 'Zona',
    'asesorId', 'Usuario', 'creadoPorId', 'Usuario');

-- Solo el servidor (Prisma, propietario de las tablas) accede.
ALTER TABLE "Zona" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ZonaAsesor" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "Zona", "ZonaAsesor" FROM anon, authenticated;
    REVOKE ALL ON FUNCTION crm_inmueble_hereda_zona(), crm_bloque_zona_a_pisos() FROM anon, authenticated;
  END IF;
END;
$$;
