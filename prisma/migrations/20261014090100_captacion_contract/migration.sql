-- Marca «Noticia»: paso 2 de 2 (contraer). NO APLICAR hasta que la versión con
-- "captacion" esté desplegada en producción: la anterior lee
-- "adquisicionPotencial" y dejaría de funcionar.
-- Para aplicarla: mover esta carpeta a prisma/migrations/ y `prisma migrate deploy`.

-- DropIndex
DROP INDEX "Inmueble_adquisicionPotencial_idx";

-- AlterTable
ALTER TABLE "Inmueble" DROP COLUMN "adquisicionPotencial";
