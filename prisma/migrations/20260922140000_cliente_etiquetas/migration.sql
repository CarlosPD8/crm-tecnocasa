-- Etiquetas múltiples por cliente (comprador, inquilino, propietario a la vez).
-- Paso 1 de 2 (expandir): se añade "tipos" y se conserva "tipoCliente" mientras
-- la versión desplegada lo lea. «Vendedor» desaparece de la app: pasa a Propietario.

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "tipos" "TipoCliente"[] DEFAULT ARRAY[]::"TipoCliente"[];

-- CreateIndex
CREATE INDEX "Cliente_tipos_idx" ON "Cliente" USING GIN ("tipos");

-- Vendedor → Propietario.
UPDATE "Cliente" SET "tipoCliente" = 'PROPIETARIO' WHERE "tipoCliente" = 'VENDEDOR';

-- Etiqueta actual, más «Propietario» para quien ya tiene inmuebles asignados.
UPDATE "Cliente" c SET "tipos" = ARRAY(
  SELECT DISTINCT t FROM unnest(
    ARRAY[c."tipoCliente"] ||
    CASE WHEN EXISTS (SELECT 1 FROM "Inmueble" i WHERE i."propietarioId" = c.id)
      THEN ARRAY['PROPIETARIO'::"TipoCliente"] ELSE ARRAY[]::"TipoCliente"[] END
  ) AS t
  ORDER BY t
);
