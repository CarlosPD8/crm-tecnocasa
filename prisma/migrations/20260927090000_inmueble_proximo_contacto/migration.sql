-- Próximo contacto también en inmuebles (captación: volver a pasar por un piso
-- aunque no se conozca al propietario). Columna nula: compatible con el código
-- desplegado antes de este cambio.
ALTER TABLE "Inmueble" ADD COLUMN "fechaProximoContacto" TIMESTAMP(3);

CREATE INDEX "Inmueble_oficinaId_fechaProximoContacto_idx" ON "Inmueble"("oficinaId", "fechaProximoContacto");
