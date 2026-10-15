-- Paso de contraer de las zonas: todo bloque y todo piso tiene zona.
--
-- Aplicar cuando la versión con zonas esté desplegada y no quede ninguna fila
-- sin zona (en Demo, después del seed). Para comprobarlo antes:
--   SELECT count(*) FROM "Bloque" WHERE "zonaId" IS NULL;
--   SELECT count(*) FROM "Inmueble" WHERE "zonaId" IS NULL;
-- Después, mover esta carpeta a prisma/migrations/ y ejecutar
-- `npx prisma migrate deploy`.

-- AlterTable
ALTER TABLE "Bloque" ALTER COLUMN "zonaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Inmueble" ALTER COLUMN "zonaId" SET NOT NULL;
