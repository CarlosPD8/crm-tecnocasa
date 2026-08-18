import Link from "next/link";
import { Pencil, Eye } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EliminarInmuebleDialog } from "@/components/inmuebles/eliminar-inmueble-dialog";
import {
  TIPO_INMUEBLE_LABELS,
  TIPO_OPERACION_LABELS,
  ESTADO_INMUEBLE_LABELS,
} from "@/lib/validations/inmueble";
import type { Inmueble } from "@/lib/generated/prisma/client";

const formatoPrecio = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const ESTADO_VARIANT: Record<string, "secondary" | "default"> = {
  DISPONIBLE: "secondary",
  RESERVADO: "default",
  VENDIDO: "default",
  ALQUILADO: "default",
};

export function InmueblesTable({ inmuebles }: { inmuebles: Inmueble[] }) {
  if (inmuebles.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No se han encontrado inmuebles.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Referencia</TableHead>
          <TableHead>Dirección</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Operación</TableHead>
          <TableHead>Precio</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {inmuebles.map((inmueble) => (
          <TableRow key={inmueble.id}>
            <TableCell className="font-medium">{inmueble.referencia}</TableCell>
            <TableCell>
              {inmueble.direccion}
              <span className="block text-xs text-muted-foreground">
                {inmueble.localidad}
              </span>
            </TableCell>
            <TableCell>{TIPO_INMUEBLE_LABELS[inmueble.tipoInmueble]}</TableCell>
            <TableCell>{TIPO_OPERACION_LABELS[inmueble.tipoOperacion]}</TableCell>
            <TableCell>{formatoPrecio.format(Number(inmueble.precio))}</TableCell>
            <TableCell>
              <Badge variant={ESTADO_VARIANT[inmueble.estado]}>
                {ESTADO_INMUEBLE_LABELS[inmueble.estado]}
              </Badge>
            </TableCell>
            <TableCell className="flex justify-end gap-1">
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
