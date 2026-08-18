-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('COMPRADOR', 'VENDEDOR', 'INQUILINO', 'PROPIETARIO');

-- CreateEnum
CREATE TYPE "TipoInmueble" AS ENUM ('PISO', 'CASA', 'CHALET', 'ATICO', 'LOCAL', 'GARAJE', 'TERRENO', 'NAVE', 'OFICINA');

-- CreateEnum
CREATE TYPE "TipoOperacion" AS ENUM ('VENTA', 'ALQUILER');

-- CreateEnum
CREATE TYPE "EstadoInmueble" AS ENUM ('DISPONIBLE', 'RESERVADO', 'VENDIDO', 'ALQUILADO');

-- CreateEnum
CREATE TYPE "CategoriaArchivo" AS ENUM ('FOTO', 'DOCUMENTO');

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "tipoCliente" "TipoCliente" NOT NULL,
    "notas" TEXT,
    "fechaUltimoContacto" TIMESTAMP(3),
    "fechaProximoContacto" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contacto" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nota" TEXT NOT NULL,

    CONSTRAINT "Contacto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inmueble" (
    "id" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "localidad" TEXT NOT NULL,
    "tipoInmueble" "TipoInmueble" NOT NULL,
    "tipoOperacion" "TipoOperacion" NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "metrosCuadrados" INTEGER,
    "habitaciones" INTEGER,
    "banos" INTEGER,
    "descripcion" TEXT,
    "estado" "EstadoInmueble" NOT NULL DEFAULT 'DISPONIBLE',
    "propietarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inmueble_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interes" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "inmuebleId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operacion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "inmuebleId" TEXT NOT NULL,
    "tipoOperacion" "TipoOperacion" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "precioFinal" DECIMAL(12,2) NOT NULL,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Operacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Archivo" (
    "id" TEXT NOT NULL,
    "categoria" "CategoriaArchivo" NOT NULL,
    "clienteId" TEXT,
    "inmuebleId" TEXT,
    "bucket" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT,
    "nombreOriginal" TEXT NOT NULL,
    "tamanioBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Archivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cliente_nombre_idx" ON "Cliente"("nombre");

-- CreateIndex
CREATE INDEX "Cliente_apellidos_idx" ON "Cliente"("apellidos");

-- CreateIndex
CREATE INDEX "Cliente_telefono_idx" ON "Cliente"("telefono");

-- CreateIndex
CREATE INDEX "Cliente_email_idx" ON "Cliente"("email");

-- CreateIndex
CREATE INDEX "Cliente_tipoCliente_idx" ON "Cliente"("tipoCliente");

-- CreateIndex
CREATE INDEX "Cliente_fechaProximoContacto_idx" ON "Cliente"("fechaProximoContacto");

-- CreateIndex
CREATE INDEX "Contacto_clienteId_idx" ON "Contacto"("clienteId");

-- CreateIndex
CREATE INDEX "Contacto_fecha_idx" ON "Contacto"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Inmueble_referencia_key" ON "Inmueble"("referencia");

-- CreateIndex
CREATE INDEX "Inmueble_localidad_idx" ON "Inmueble"("localidad");

-- CreateIndex
CREATE INDEX "Inmueble_estado_idx" ON "Inmueble"("estado");

-- CreateIndex
CREATE INDEX "Inmueble_tipoOperacion_idx" ON "Inmueble"("tipoOperacion");

-- CreateIndex
CREATE INDEX "Inmueble_tipoInmueble_idx" ON "Inmueble"("tipoInmueble");

-- CreateIndex
CREATE INDEX "Inmueble_propietarioId_idx" ON "Inmueble"("propietarioId");

-- CreateIndex
CREATE INDEX "Inmueble_localidad_estado_tipoOperacion_idx" ON "Inmueble"("localidad", "estado", "tipoOperacion");

-- CreateIndex
CREATE INDEX "Interes_clienteId_idx" ON "Interes"("clienteId");

-- CreateIndex
CREATE INDEX "Interes_inmuebleId_idx" ON "Interes"("inmuebleId");

-- CreateIndex
CREATE INDEX "Operacion_clienteId_idx" ON "Operacion"("clienteId");

-- CreateIndex
CREATE INDEX "Operacion_inmuebleId_idx" ON "Operacion"("inmuebleId");

-- CreateIndex
CREATE INDEX "Operacion_fecha_idx" ON "Operacion"("fecha");

-- CreateIndex
CREATE INDEX "Archivo_clienteId_idx" ON "Archivo"("clienteId");

-- CreateIndex
CREATE INDEX "Archivo_inmuebleId_idx" ON "Archivo"("inmuebleId");

-- CreateIndex
CREATE INDEX "Archivo_categoria_idx" ON "Archivo"("categoria");

-- CreateIndex
CREATE INDEX "Archivo_inmuebleId_categoria_orden_idx" ON "Archivo"("inmuebleId", "categoria", "orden");

-- AddForeignKey
ALTER TABLE "Contacto" ADD CONSTRAINT "Contacto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inmueble" ADD CONSTRAINT "Inmueble_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interes" ADD CONSTRAINT "Interes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interes" ADD CONSTRAINT "Interes_inmuebleId_fkey" FOREIGN KEY ("inmuebleId") REFERENCES "Inmueble"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operacion" ADD CONSTRAINT "Operacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operacion" ADD CONSTRAINT "Operacion_inmuebleId_fkey" FOREIGN KEY ("inmuebleId") REFERENCES "Inmueble"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Archivo" ADD CONSTRAINT "Archivo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Archivo" ADD CONSTRAINT "Archivo_inmuebleId_fkey" FOREIGN KEY ("inmuebleId") REFERENCES "Inmueble"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: un archivo debe pertenecer a un cliente o a un inmueble (o a ambos)
ALTER TABLE "Archivo" ADD CONSTRAINT "archivo_cliente_o_inmueble_check" CHECK (num_nonnulls("clienteId", "inmuebleId") >= 1);
