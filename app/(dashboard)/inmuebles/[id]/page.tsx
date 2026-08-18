import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getUrlFirmadaDocumento } from "@/lib/supabase/storage";
import { subirArchivoInmueble } from "@/lib/actions/archivos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ArchivosList } from "@/components/shared/archivos-list";
import { ArchivoUpload } from "@/components/shared/archivo-upload";
import { FotosGallery } from "@/components/inmuebles/fotos-gallery";
import { InteresadosList } from "@/components/inmuebles/interesados-list";
import { OperacionPanel } from "@/components/inmuebles/operacion-panel";
import {
  TIPO_INMUEBLE_LABELS,
  TIPO_OPERACION_LABELS,
  ESTADO_INMUEBLE_LABELS,
} from "@/lib/validations/inmueble";

const formatoPrecio = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default async function InmuebleDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const inmueble = await prisma.inmueble.findUnique({
    where: { id },
    include: {
      propietario: true,
      archivos: { orderBy: { orden: "asc" } },
      intereses: { include: { cliente: true }, orderBy: { fecha: "desc" } },
      operaciones: { include: { cliente: true }, orderBy: { fecha: "desc" } },
    },
  });

  if (!inmueble) notFound();

  const fotos = inmueble.archivos.filter((a) => a.categoria === "FOTO");
  const documentos = inmueble.archivos.filter((a) => a.categoria === "DOCUMENTO");

  const documentosConUrl = await Promise.all(
    documentos.map(async (archivo) => ({
      id: archivo.id,
      nombreOriginal: archivo.nombreOriginal,
      tamanioBytes: archivo.tamanioBytes,
      url: await getUrlFirmadaDocumento(archivo.path),
    }))
  );

  const puedeCerrarOperacion =
    inmueble.estado === "DISPONIBLE" || inmueble.estado === "RESERVADO";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{inmueble.referencia}</h1>
          <p className="text-sm text-muted-foreground">
            {inmueble.direccion}, {inmueble.localidad}
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link href={`/inmuebles/${inmueble.id}/editar`}>
              <Pencil /> Editar
            </Link>
          }
        />
      </div>

      <Tabs defaultValue="datos">
        <TabsList>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="fotos">Fotos ({fotos.length})</TabsTrigger>
          <TabsTrigger value="documentos">Documentos ({documentos.length})</TabsTrigger>
          <TabsTrigger value="interesados">
            Interesados ({inmueble.intereses.length})
          </TabsTrigger>
          <TabsTrigger value="operacion">Operación</TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <Card>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <Badge variant="secondary">
                  {TIPO_INMUEBLE_LABELS[inmueble.tipoInmueble]}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Operación</p>
                <p className="text-sm">{TIPO_OPERACION_LABELS[inmueble.tipoOperacion]}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Precio</p>
                <p className="text-sm">{formatoPrecio.format(Number(inmueble.precio))}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <Badge>{ESTADO_INMUEBLE_LABELS[inmueble.estado]}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Metros cuadrados</p>
                <p className="text-sm">{inmueble.metrosCuadrados ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Habitaciones / Baños</p>
                <p className="text-sm">
                  {inmueble.habitaciones ?? "—"} / {inmueble.banos ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Propietario</p>
                <p className="text-sm">
                  {inmueble.propietario ? (
                    <Link
                      href={`/clientes/${inmueble.propietario.id}`}
                      className="hover:underline"
                    >
                      {inmueble.propietario.nombre} {inmueble.propietario.apellidos}
                    </Link>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Descripción</p>
                <p className="whitespace-pre-wrap text-sm">
                  {inmueble.descripcion ?? "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fotos">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <ArchivoUpload
                label="Subir foto"
                onUpload={subirArchivoInmueble.bind(null, inmueble.id, "FOTO")}
              />
              <FotosGallery
                fotos={fotos.map((f) => ({
                  id: f.id,
                  url: f.url!,
                  nombreOriginal: f.nombreOriginal,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <ArchivoUpload
                onUpload={subirArchivoInmueble.bind(null, inmueble.id, "DOCUMENTO")}
              />
              <ArchivosList archivos={documentosConUrl} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interesados">
          <Card>
            <CardContent>
              <InteresadosList
                inmuebleId={inmueble.id}
                interesados={inmueble.intereses.map((interes) => ({
                  id: interes.id,
                  clienteId: interes.clienteId,
                  clienteNombre: `${interes.cliente.nombre} ${interes.cliente.apellidos}`,
                  fecha: interes.fecha,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operacion">
          <Card>
            <CardContent>
              <OperacionPanel
                inmuebleId={inmueble.id}
                tipoOperacionSugerida={inmueble.tipoOperacion}
                puedeCerrar={puedeCerrarOperacion}
                operaciones={inmueble.operaciones.map((operacion) => ({
                  id: operacion.id,
                  clienteId: operacion.clienteId,
                  clienteNombre: `${operacion.cliente.nombre} ${operacion.cliente.apellidos}`,
                  tipoOperacion: operacion.tipoOperacion,
                  fecha: operacion.fecha,
                  precioFinal: operacion.precioFinal.toString(),
                  notas: operacion.notas,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
