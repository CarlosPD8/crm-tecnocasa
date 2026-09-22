import Link from "next/link";
import { notFound } from "next/navigation";
import { Home, Pencil, Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { resumenPorBloque } from "@/lib/bloques";
import { formatBloque } from "@/lib/validations/bloque";
import {
  OCUPACION_LABELS,
  TIPO_INMUEBLE_LABELS,
  TIPO_OPERACION_LABELS,
  formatUbicacion,
  type OcupacionForm,
} from "@/lib/validations/inmueble";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/inmuebles/estado-badge";
import { OcupacionBadge, PotencialBadge, UltimoContacto } from "@/components/inmuebles/situacion";
import { EliminarBloqueDialog } from "@/components/bloques/eliminar-bloque-dialog";
import { ENLACE_FILA, ENLACE_INTERIOR, FILA_CLICABLE } from "@/components/shared/row-link";
import { cn } from "@/lib/utils";

const formatoPrecio = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const ORDEN_OCUPACION: OcupacionForm[] = ["PROPIETARIO", "INQUILINOS", "VACIO", "SIN_DATOS"];

export default async function BloqueDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const bloque = await prisma.bloque.findUnique({
    where: { id },
    include: {
      inmuebles: {
        // Top-down reading of the building: staircase, then floor, then door.
        orderBy: [
          { escalera: { sort: "asc", nulls: "last" } },
          { planta: { sort: "asc", nulls: "last" } },
          { puerta: { sort: "asc", nulls: "last" } },
        ],
        include: { propietario: { select: { id: true, nombre: true, apellidos: true } } },
      },
    },
  });

  if (!bloque) notFound();

  const resumen = (await resumenPorBloque([bloque.id])).get(bloque.id)!;
  const direccion = formatBloque(bloque);
  const detalles = [bloque.nombre, bloque.localidad, bloque.codigoPostal].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/bloques", label: "Bloques" }}
        eyebrow="Bloque"
        title={direccion}
        description={detalles}
        actions={
          <>
            <EliminarBloqueDialog bloqueId={bloque.id} direccion={direccion} pisos={bloque.inmuebles.length} />
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              render={
                <Link href={`/bloques/${bloque.id}/editar`}>
                  <Pencil /> Editar
                </Link>
              }
            />
            <Button
              size="lg"
              nativeButton={false}
              render={
                <Link href={`/inmuebles/nuevo?bloque=${bloque.id}`}>
                  <Plus /> Añadir piso
                </Link>
              }
            />
          </>
        }
      />

      {/* gap-px over a border-colored background draws the dividers at every breakpoint. */}
      <dl className="rise grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border/70 shadow-soft ring-1 ring-foreground/6 [animation-delay:60ms] sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 flex flex-col gap-2 bg-card p-5 sm:col-span-1">
          <dt className="eyebrow">Pisos</dt>
          <dd className="font-display tabular text-4xl leading-none">{bloque.inmuebles.length}</dd>
        </div>
        {ORDEN_OCUPACION.map((k) => (
          <div key={k} className="flex flex-col gap-2 bg-card p-5">
            <dt className="eyebrow">{OCUPACION_LABELS[k]}</dt>
            <dd className="font-display tabular text-3xl leading-none">{resumen.ocupacion[k]}</dd>
          </div>
        ))}
        <div className="flex flex-col gap-2 bg-card p-5">
          <dt className="eyebrow">Potenciales</dt>
          <dd className="font-display tabular text-3xl leading-none text-primary">{resumen.potenciales}</dd>
        </div>
      </dl>

      {bloque.inmuebles.length === 0 ? (
        <EmptyState
          icon={Home}
          title="Este bloque aún no tiene pisos"
          description="Añade los pisos del edificio indicando escalera, planta y puerta para verlos ordenados aquí."
          action={
            <Button
              nativeButton={false}
              render={<Link href={`/inmuebles/nuevo?bloque=${bloque.id}`}>Añadir piso</Link>}
            />
          }
        />
      ) : (
        <Table className="rise [animation-delay:120ms]">
          <TableHeader>
            <TableRow>
              <TableHead>Piso</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Ocupación</TableHead>
              <TableHead>Propietario</TableHead>
              <TableHead>Último contacto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bloque.inmuebles.map((piso) => (
              <TableRow key={piso.id} className={FILA_CLICABLE}>
                <TableCell>
                  <Link
                    href={`/inmuebles/${piso.id}`}
                    data-row-link
                    className={cn("flex items-center gap-2 font-medium", ENLACE_FILA)}
                  >
                    {formatUbicacion(piso) ?? <span className="text-muted-foreground">Sin ubicar</span>}
                    {piso.adquisicionPotencial && <PotencialBadge compact />}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs">{piso.referencia}</TableCell>
                <TableCell>
                  <span className="block">{TIPO_INMUEBLE_LABELS[piso.tipoInmueble]}</span>
                  <span className="block text-xs text-muted-foreground">
                    {TIPO_OPERACION_LABELS[piso.tipoOperacion]}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatoPrecio.format(Number(piso.precio))}
                </TableCell>
                <TableCell>
                  <EstadoBadge estado={piso.estado} />
                </TableCell>
                <TableCell>
                  <OcupacionBadge ocupacion={piso.ocupacion} />
                </TableCell>
                <TableCell>
                  {piso.propietario ? (
                    <Link
                      href={`/clientes/${piso.propietario.id}`}
                      className={cn(ENLACE_INTERIOR, "hover:text-primary hover:underline underline-offset-4")}
                    >
                      {piso.propietario.nombre} {piso.propietario.apellidos}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <UltimoContacto fecha={piso.fechaUltimoContacto} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {bloque.notas && (
        <section className="rise flex flex-col gap-2 rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/6">
          <h2 className="eyebrow">Notas del edificio</h2>
          <p className="max-w-[70ch] text-sm leading-relaxed whitespace-pre-wrap">{bloque.notas}</p>
        </section>
      )}
    </div>
  );
}
