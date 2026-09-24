import Link from "next/link";
import { House, SearchX } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ENLACE_FILA } from "@/components/shared/row-link";
import { FilaEnlace } from "@/components/shared/fila-enlace";
import { EstadoBadge } from "@/components/inmuebles/estado-badge";
import { OcupacionBadge, PotencialBadge, UltimoContacto } from "@/components/inmuebles/situacion";
import {
  TIPO_INMUEBLE_LABELS,
  TIPO_OPERACION_LABELS,
  formatUbicacion,
} from "@/lib/validations/inmueble";
import { formatBloque } from "@/lib/validations/bloque";
import { cn } from "@/lib/utils";
import type { Inmueble } from "@/lib/generated/prisma/client";

type InmuebleFila = Inmueble & {
  bloque: { id: string; calle: string; numero: string } | null;
  asesor?: { nombre: string } | null;
};

const formatoPrecio = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function InmueblesTable({
  inmuebles,
  filtrado = false,
}: {
  inmuebles: InmuebleFila[];
  filtrado?: boolean;
}) {
  if (inmuebles.length === 0) {
    return filtrado ? (
      <EmptyState
        icon={SearchX}
        title="Ningún inmueble coincide con la búsqueda"
        description="Prueba con otra referencia, calle o bloque, o quita alguno de los filtros."
      />
    ) : (
      <EmptyState
        icon={House}
        title="Aún no hay inmuebles"
        description="Añade el primer piso, local o garaje de la cartera para empezar a cruzarlo con clientes."
        action={
          <Button
            nativeButton={false}
            render={<Link href="/inmuebles/nuevo">Añadir inmueble</Link>}
          />
        }
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Referencia</TableHead>
          <TableHead>Dirección</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Precio</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Ocupación</TableHead>
          <TableHead>Último contacto</TableHead>
          <TableHead className="hidden xl:table-cell">Asesor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {inmuebles.map((inmueble) => {
          const ubicacion = formatUbicacion(inmueble);
          return (
            <FilaEnlace key={inmueble.id} href={`/inmuebles/${inmueble.id}`}>
              <TableCell>
                <span className="flex items-center gap-1.5">
                  <Link
                    href={`/inmuebles/${inmueble.id}`}
                    data-row-link
                    className={cn("font-mono text-xs font-medium", ENLACE_FILA)}
                  >
                    {inmueble.referencia}
                  </Link>
                  {inmueble.adquisicionPotencial && <PotencialBadge compact />}
                </span>
              </TableCell>
              <TableCell>
                <span className="block font-medium">
                  {inmueble.direccion}
                  {ubicacion && <span className="font-normal text-muted-foreground"> · {ubicacion}</span>}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {inmueble.localidad}
                  {inmueble.bloque && (
                    <>
                      {" · "}
                      <Link
                        href={`/bloques/${inmueble.bloque.id}`}
                        className={cn("underline-offset-4 hover:text-primary hover:underline")}
                      >
                        Bloque {formatBloque(inmueble.bloque)}
                      </Link>
                    </>
                  )}
                </span>
              </TableCell>
              <TableCell>
                <span className="block">{TIPO_INMUEBLE_LABELS[inmueble.tipoInmueble]}</span>
                <span className="block text-xs text-muted-foreground">
                  {TIPO_OPERACION_LABELS[inmueble.tipoOperacion]}
                </span>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatoPrecio.format(Number(inmueble.precio))}
              </TableCell>
              <TableCell>
                <EstadoBadge estado={inmueble.estado} />
              </TableCell>
              <TableCell>
                <OcupacionBadge ocupacion={inmueble.ocupacion} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                <UltimoContacto fecha={inmueble.fechaUltimoContacto} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground xl:table-cell">
                {inmueble.asesor?.nombre ?? "—"}
              </TableCell>
            </FilaEnlace>
          );
        })}
      </TableBody>
    </Table>
  );
}
