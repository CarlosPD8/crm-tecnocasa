-- Registrar solo desde la zona o la oficina (punto 4). Solo añade: compatible
-- con la versión desplegada, que no conoce estas columnas. El control nace
-- apagado en todas las oficinas, así que no cambia nada hasta que el director
-- lo encienda.
--
-- 'OFICINA' no se usa en esta migración: un valor nuevo de enum no se puede usar
-- en la misma transacción que lo añade.

-- AlterEnum
ALTER TYPE "EntidadActividad" ADD VALUE 'OFICINA';

-- AlterTable
ALTER TABLE "Oficina" ADD COLUMN     "controlUbicacion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "controlUbicacionDesde" TIMESTAMP(3),
ADD COLUMN     "latitud" DOUBLE PRECISION,
ADD COLUMN     "longitud" DOUBLE PRECISION,
ADD COLUMN     "radioMetros" INTEGER NOT NULL DEFAULT 150,
ADD COLUMN     "redes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Actividad" ADD COLUMN     "lugar" TEXT;

-- AlterTable
ALTER TABLE "Zona" ADD COLUMN     "forma" JSONB;

-- Coherencia -------------------------------------------------------------------

ALTER TABLE "Oficina" ADD CONSTRAINT "Oficina_punto_completo"
  CHECK (("latitud" IS NULL) = ("longitud" IS NULL));
ALTER TABLE "Oficina" ADD CONSTRAINT "Oficina_punto_valido"
  CHECK ("latitud" IS NULL OR ("latitud" BETWEEN -90 AND 90 AND "longitud" BETWEEN -180 AND 180));
ALTER TABLE "Oficina" ADD CONSTRAINT "Oficina_radio_valido"
  CHECK ("radioMetros" BETWEEN 50 AND 1000);
-- Sin la oficina en el mapa, el control dejaría a los asesores sin sitio desde
-- el que registrar (salvo sus zonas): no se puede encender.
ALTER TABLE "Oficina" ADD CONSTRAINT "Oficina_control_con_punto"
  CHECK (NOT "controlUbicacion" OR "latitud" IS NOT NULL);
ALTER TABLE "Oficina" ADD CONSTRAINT "Oficina_redes_max"
  CHECK (cardinality("redes") <= 5);

ALTER TABLE "Zona" ADD CONSTRAINT "Zona_forma_objeto"
  CHECK ("forma" IS NULL OR jsonb_typeof("forma") = 'object');
