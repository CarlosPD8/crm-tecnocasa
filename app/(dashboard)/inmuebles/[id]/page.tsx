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
import { PageHeader } from "@/components/shared/page-header";
import { DataItem, DataList } from "@/components/shared/data-list";
import { EstadoBadge } from "@/components/inmuebles/estado-badge";
import { TabCount } from "@/components/shared/tab-count";
import {
  TIPO_INMUEBLE_LABELS,
  TIPO_OPERACION_LABELS,
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
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/inmuebles", label: "Inmuebles" }}
        eyebrow={<span className="font-mono tracking-normal normal-case">{inmueble.referencia}</span>}
        title={inmueble.direccion}
        description={`${inmueble.localidad} · ${TIPO_INMUEBLE_LABELS[inmueble.tipoInmueble]} · ${TIPO_OPERACION_LABELS[inmueble.tipoOperacion]}`}
        actions={
          <Button
            variant="outline"
            size="lg"
            nativeButton={false}
            render={
              <Link href={`/inmuebles/${inmueble.id}/editar`}>
                <Pencil /> Editar
              </Link>
            }
          />
        }
      />

      <dl className="rise grid grid-cols-2 overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-foreground/6 [animation-delay:60ms] sm:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-2 p-5 sm:col-span-1">
          <dt className="eyebrow">Precio</dt>
          <dd className="font-display tabular text-4xl leading-none">
            {formatoPrecio.format(Number(inmueble.precio))}
          </dd>
        </div>
        <div className="flex flex-col gap-2 border-t border-border/70 p-5 sm:border-t-0 sm:border-l">
          <dt className="eyebrow">Estado</dt>
          <dd>
            <EstadoBadge estado={inmueble.estado} className="text-sm" />
          </dd>
        </div>
        <div className="flex flex-col gap-2 border-t border-l border-border/70 p-5 sm:border-t-0">
          <dt className="eyebrow">Superficie</dt>
          <dd className="tabular text-sm font-medium">
            {inmueble.metrosCuadrados ? `${inmueble.metrosCuadrados} m²` : "—"}
          </dd>
        </div>
        <div className="col-span-2 flex flex-col gap-2 border-t border-border/70 p-5 sm:col-span-1 sm:border-t-0 sm:border-l">
          <dt className="eyebrow">Hab. / Baños</dt>
          <dd className="tabular text-sm font-medium">
            {inmueble.habitaciones ?? "—"} / {inmueble.banos ?? "—"}
          </dd>
        </div>
      </dl>

      <Tabs defaultValue="datos" className="rise [animation-delay:120ms]">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="fotos">
            Fotos <TabCount n={fotos.length} />
          </TabsTrigger>
          <TabsTrigger value="documentos">
            Documentos <TabCount n={documentos.length} />
          </TabsTrigger>
          <TabsTrigger value="interesados">
            Interesados <TabCount n={inmueble.intereses.length} />
          </TabsTrigger>
          <TabsTrigger value="operacion">
            Operación <TabCount n={inmueble.operaciones.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <Card>
            <CardContent>
              <DataList className="lg:grid-cols-3">
                <DataItem label="Tipo">
                  <Badge variant="secondary">{TIPO_INMUEBLE_LABELS[inmueble.tipoInmueble]}</Badge>
                </DataItem>
                <DataItem label="Operación">
                  {TIPO_OPERACION_LABELS[inmueble.tipoOperacion]}
                </DataItem>
                <DataItem label="Propietario">
                  {inmueble.propietario ? (
                    <Link
                      href={`/clientes/${inmueble.propietario.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {inmueble.propietario.nombre} {inmueble.propietario.apellidos}
                    </Link>
                  ) : (
                    "—"
                  )}
                </DataItem>
                <DataItem label="Descripción" className="sm:col-span-2 lg:col-span-3">
                  <p className="max-w-[70ch] whitespace-pre-wrap leading-relaxed">
                    {inmueble.descripcion ?? "—"}
                  </p>
                </DataItem>
              </DataList>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fotos">
          <Card>
            <CardContent className="flex flex-col gap-5">
              <ArchivoUpload
                label="Subir foto"
                accept="image/*"
                hint="JPG, PNG o WebP. Reordénalas con las flechas; la primera es la portada."
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
            <CardContent className="flex flex-col gap-5">
              <ArchivoUpload
                hint="Nota simple, certificado energético, planos, contrato de encargo…"
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
