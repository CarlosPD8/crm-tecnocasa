-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN "dni" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_dni_key" ON "Cliente"("dni");
