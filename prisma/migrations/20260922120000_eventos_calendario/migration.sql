-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('VISITA', 'REUNION', 'LLAMADA', 'FIRMA', 'OTRO');

-- CreateTable
CREATE TABLE "Evento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL DEFAULT 'OTRO',
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "todoElDia" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "clienteId" TEXT,
    "inmuebleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Evento_inicio_fin_idx" ON "Evento"("inicio", "fin");

-- CreateIndex
CREATE INDEX "Evento_clienteId_idx" ON "Evento"("clienteId");

-- CreateIndex
CREATE INDEX "Evento_inmuebleId_idx" ON "Evento"("inmuebleId");

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_inmuebleId_fkey" FOREIGN KEY ("inmuebleId") REFERENCES "Inmueble"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- A calendar entry never ends before it starts.
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_fin_despues_de_inicio_check" CHECK ("fin" >= "inicio");
