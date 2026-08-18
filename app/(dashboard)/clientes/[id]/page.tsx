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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {cliente.nombre} {cliente.apellidos}
        </h1>
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link href={`/clientes/${cliente.id}/editar`}>
              <Pencil /> Editar
            </Link>
          }
        />
      </div>

      <Tabs defaultValue="datos">
        <TabsList>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="contactos">
            Contactos ({cliente.contactos.length})
          </TabsTrigger>
          <TabsTrigger value="archivos">
            Archivos ({cliente.archivos.length})
          </TabsTrigger>
          <TabsTrigger value="intereses">Intereses y operaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <Card>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <Badge variant="secondary">
                  {TIPO_CLIENTE_LABELS[cliente.tipoCliente]}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Teléfono</p>
                <p className="text-sm">{cliente.telefono ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm">{cliente.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dirección</p>
                <p className="text-sm">{cliente.direccion ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Último contacto
                </p>
                <p className="text-sm">
                  {cliente.fechaUltimoContacto
                    ? format(cliente.fechaUltimoContacto, "dd/MM/yyyy HH:mm")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Próximo contacto
                </p>
                <p className="text-sm">
                  {cliente.fechaProximoContacto
                    ? format(cliente.fechaProximoContacto, "dd/MM/yyyy")
                    : "—"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Notas</p>
                <p className="whitespace-pre-wrap text-sm">
                  {cliente.notas ?? "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contactos">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <ContactoForm clienteId={cliente.id} />
              <ContactosList contactos={cliente.contactos} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archivos">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <ArchivoUpload onUpload={subirArchivoCliente.bind(null, cliente.id)} />
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
