import Link from "next/link";
import { Pencil, Eye, House, SearchX } from "lucide-react";

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
import { EstadoBadge } from "@/components/inmuebles/estado-badge";
import { EliminarInmuebleDialog } from "@/components/inmuebles/eliminar-inmueble-dialog";
import {
  TIPO_INMUEBLE_LABELS,
  TIPO_OPERACION_LABELS,
} from "@/lib/validations/inmueble";
import type { Inmueble } from "@/lib/generated/prisma/client";

const formatoPrecio = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function InmueblesTable({
  inmuebles,
  filtrado = false,
}: {
  inmuebles: Inmueble[];
  filtrado?: boolean;
}) {
  if (inmuebles.length === 0) {
    return filtrado ? (
      <EmptyState
        icon={SearchX}
        title="Ningún inmueble coincide con la búsqueda"
        description="Prueba con otra referencia, calle o localidad, o quita alguno de los filtros."
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
          <TableHead className="text-right">
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {inmuebles.map((inmueble) => (
          <TableRow key={inmueble.id} className="group/row">
            <TableCell>
              <Link
                href={`/inmuebles/${inmueble.id}`}
                className="font-mono text-xs font-medium hover:text-primary"
              >
                {inmueble.referencia}
              </Link>
            </TableCell>
            <TableCell>
              <span className="block font-medium">{inmueble.direccion}</span>
              <span className="block text-xs text-muted-foreground">{inmueble.localidad}</span>
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
              <div className="flex justify-end gap-0.5 opacity-60 transition-opacity duration-200 group-hover/row:opacity-100 focus-within:opacity-100">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Ver inmueble"
                  nativeButton={false}
                  render={
                    <Link href={`/inmuebles/${inmueble.id}`}>
                      <Eye />
                    </Link>
                  }
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Editar inmueble"
                  nativeButton={false}
                  render={
                    <Link href={`/inmuebles/${inmueble.id}/editar`}>
                      <Pencil />
                    </Link>
                  }
                />
                <EliminarInmuebleDialog
                  inmuebleId={inmueble.id}
                  referencia={inmueble.referencia}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
