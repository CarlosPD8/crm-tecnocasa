import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Pencil } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getUrlFirmadaDocumento } from "@/lib/supabase/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { DataItem, DataList } from "@/components/shared/data-list";
import { ListHeading } from "@/components/shared/item-list";
import { TabCount } from "@/components/shared/tab-count";
import { ContactosList } from "@/components/clientes/contactos-list";
import { ContactoForm } from "@/components/clientes/contacto-form";
import { ArchivosList } from "@/components/shared/archivos-list";
import { ArchivoUpload } from "@/components/shared/archivo-upload";
import { InteresesList } from "@/components/clientes/intereses-list";
import { TIPO_CLIENTE_LABELS } from "@/lib/validations/cliente";
import { subirArchivoCliente } from "@/lib/actions/archivos";

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      contactos: { orderBy: { fecha: "desc" } },
      archivos: { orderBy: { orden: "asc" } },
      intereses: { include: { inmueble: true }, orderBy: { fecha: "desc" } },
      operaciones: { include: { inmueble: true }, orderBy: { fecha: "desc" } },
    },
  });

  if (!cliente) notFound();

  const archivosConUrl = await Promise.all(
    cliente.archivos.map(async (archivo) => ({
      id: archivo.id,
      nombreOriginal: archivo.nombreOriginal,
      tamanioBytes: archivo.tamanioBytes,
      url: await getUrlFirmadaDocumento(archivo.path),
    }))
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/clientes", label: "Clientes" }}
        eyebrow={TIPO_CLIENTE_LABELS[cliente.tipoCliente]}
        title={`${cliente.nombre} ${cliente.apellidos}`}
        description={[cliente.telefono, cliente.email].filter(Boolean).join(" · ") || undefined}
        actions={
          <Button
            variant="outline"
            size="lg"
            nativeButton={false}
            render={
              <Link href={`/clientes/${cliente.id}/editar`}>
                <Pencil /> Editar
              </Link>
            }
          />
        }
      />

      <Tabs defaultValue="datos" className="rise [animation-delay:80ms]">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="contactos">
            Contactos <TabCount n={cliente.contactos.length} />
          </TabsTrigger>
          <TabsTrigger value="archivos">
            Archivos <TabCount n={cliente.archivos.length} />
          </TabsTrigger>
          <TabsTrigger value="intereses">
            Intereses y operaciones{" "}
            <TabCount n={cliente.intereses.length + cliente.operaciones.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <Card>
            <CardContent>
              <DataList className="lg:grid-cols-3">
                <DataItem label="Tipo">
                  <Badge variant="secondary">{TIPO_CLIENTE_LABELS[cliente.tipoCliente]}</Badge>
                </DataItem>
                <DataItem label="Teléfono">{cliente.telefono ?? "—"}</DataItem>
                <DataItem label="Email">{cliente.email ?? "—"}</DataItem>
                <DataItem label="Dirección">{cliente.direccion ?? "—"}</DataItem>
                <DataItem label="Último contacto">
                  <span className="tabular">
                    {cliente.fechaUltimoContacto
                      ? format(cliente.fechaUltimoContacto, "dd/MM/yyyy HH:mm")
                      : "—"}
                  </span>
                </DataItem>
                <DataItem label="Próximo contacto">
                  <span className="tabular">
                    {cliente.fechaProximoContacto
                      ? format(cliente.fechaProximoContacto, "dd/MM/yyyy")
                      : "—"}
                  </span>
                </DataItem>
                <DataItem label="Notas" className="sm:col-span-2 lg:col-span-3">
                  <p className="max-w-[70ch] whitespace-pre-wrap leading-relaxed">
                    {cliente.notas ?? "—"}
                  </p>
                </DataItem>
              </DataList>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contactos">
          <Card>
            <CardContent className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
              <div className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
                <ListHeading title="Registrar contacto" />
                <ContactoForm clienteId={cliente.id} />
              </div>
              <div className="flex flex-col gap-4">
                <ListHeading title="Historial" count={cliente.contactos.length} />
                <ContactosList contactos={cliente.contactos} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archivos">
          <Card>
            <CardContent className="flex flex-col gap-5">
              <ArchivoUpload
                onUpload={subirArchivoCliente.bind(null, cliente.id)}
                hint="DNI, nóminas, contratos, notas simples…"
              />
              <ArchivosList archivos={archivosConUrl} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intereses">
          <Card>
            <CardContent>
              <InteresesList
                intereses={cliente.intereses}
                operaciones={cliente.operaciones}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
