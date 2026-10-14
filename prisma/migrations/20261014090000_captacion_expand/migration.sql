-- Marca «Noticia»: el sí/no de "adquisicionPotencial" pasa a "captacion"
-- (null = sin marca, POTENCIAL o NOTICIA). Un piso solo lleva una de las dos.
-- Paso 1 de 2 (expandir): compatible con la versión desplegada, que sigue
-- leyendo y escribiendo "adquisicionPotencial". Esa columna se queda (fuera del
-- schema) hasta captacion_contract, en prisma/pendiente/.
-- Lo que la versión anterior marque entre esta migración y el despliegue no
-- se copia: desplegar justo después.

-- CreateEnum
CREATE TYPE "Captacion" AS ENUM ('POTENCIAL', 'NOTICIA');

-- AlterTable
ALTER TABLE "Inmueble" ADD COLUMN     "captacion" "Captacion";

UPDATE "Inmueble" SET "captacion" = 'POTENCIAL' WHERE "adquisicionPotencial";

-- CreateIndex
CREATE INDEX "Inmueble_oficinaId_captacion_idx" ON "Inmueble"("oficinaId", "captacion");
