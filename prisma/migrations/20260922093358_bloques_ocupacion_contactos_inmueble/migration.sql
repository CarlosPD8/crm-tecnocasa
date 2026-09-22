-- CreateEnum
CREATE TYPE "Ocupacion" AS ENUM ('INQUILINOS', 'PROPIETARIO', 'VACIO');

-- AlterTable
ALTER TABLE "Contacto" ADD COLUMN     "inmuebleId" TEXT,
ALTER COLUMN "clienteId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Inmueble" ADD COLUMN     "adquisicionPotencial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bloqueId" TEXT,
ADD COLUMN     "escalera" TEXT,
ADD COLUMN     "fechaUltimoContacto" TIMESTAMP(3),
ADD COLUMN     "ocupacion" "Ocupacion",
ADD COLUMN     "planta" INTEGER,
ADD COLUMN     "puerta" TEXT;

-- CreateTable
CREATE TABLE "Bloque" (
    "id" TEXT NOT NULL,
    "calle" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "localidad" TEXT NOT NULL,
    "nombre" TEXT,
    "codigoPostal" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bloque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bloque_localidad_idx" ON "Bloque"("localidad");

-- CreateIndex
CREATE UNIQUE INDEX "Bloque_calle_numero_localidad_key" ON "Bloque"("calle", "numero", "localidad");

-- CreateIndex
CREATE INDEX "Contacto_inmuebleId_idx" ON "Contacto"("inmuebleId");

-- CreateIndex
CREATE INDEX "Inmueble_bloqueId_idx" ON "Inmueble"("bloqueId");

-- CreateIndex
CREATE INDEX "Inmueble_bloqueId_escalera_planta_puerta_idx" ON "Inmueble"("bloqueId", "escalera", "planta", "puerta");

-- CreateIndex
CREATE INDEX "Inmueble_ocupacion_idx" ON "Inmueble"("ocupacion");

-- CreateIndex
CREATE INDEX "Inmueble_adquisicionPotencial_idx" ON "Inmueble"("adquisicionPotencial");

-- CreateIndex
CREATE INDEX "Inmueble_fechaUltimoContacto_idx" ON "Inmueble"("fechaUltimoContacto");

-- AddForeignKey
ALTER TABLE "Contacto" ADD CONSTRAINT "Contacto_inmuebleId_fkey" FOREIGN KEY ("inmuebleId") REFERENCES "Inmueble"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inmueble" ADD CONSTRAINT "Inmueble_bloqueId_fkey" FOREIGN KEY ("bloqueId") REFERENCES "Bloque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Manual: a contact must belong to a client, a property, or both.
ALTER TABLE "Contacto" ADD CONSTRAINT "Contacto_cliente_o_inmueble_check" CHECK ("clienteId" IS NOT NULL OR "inmuebleId" IS NOT NULL);
