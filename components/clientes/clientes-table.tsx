import Link from "next/link";
import { UserPlus, SearchX } from "lucide-react";
import { format, isPast, isToday } from "date-fns";

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
import { ENLACE_FILA, FILA_CLICABLE } from "@/components/shared/row-link";
import { EtiquetasCliente } from "@/components/clientes/etiquetas-cliente";
import { cn } from "@/lib/utils";
import type { Cliente } from "@/lib/generated/prisma/client";

export function ClientesTable({
  clientes,
  filtrado = false,
}: {
  clientes: Cliente[];
  filtrado?: boolean;
}) {
  if (clientes.length === 0) {
    return filtrado ? (
      <EmptyState
        icon={SearchX}
        title="Ningún cliente coincide con la búsqueda"
        description="Prueba con otro nombre, teléfono o DNI, o quita alguno de los filtros."
      />
    ) : (
      <EmptyState
        icon={UserPlus}
        title="Aún no hay clientes"
        description="Da de alta el primer comprador, vendedor o inquilino para empezar a hacer seguimiento."
        action={
          <Button
            nativeButton={false}
            render={<Link href="/clientes/nuevo">Añadir cliente</Link>}
          />
        }
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Próximo contacto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clientes.map((cliente) => {
          const proximo = cliente.fechaProximoContacto;
          const vencido = proximo && (isToday(proximo) || isPast(proximo));
          return (
            <TableRow key={cliente.id} className={FILA_CLICABLE}>
              <TableCell>
                <Link
                  href={`/clientes/${cliente.id}`}
                  data-row-link
                  className={cn("flex items-center gap-3", ENLACE_FILA)}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-[30%] bg-secondary text-xs font-semibold text-secondary-foreground">
                    {`${cliente.nombre[0] ?? ""}${cliente.apellidos[0] ?? ""}`.toUpperCase()}
                  </span>
                  <span>
                    <span className="block font-medium">
                      {cliente.nombre} {cliente.apellidos}
                    </span>
                    {cliente.dni && (
                      <span className="block font-mono text-xs text-muted-foreground">{cliente.dni}</span>
                    )}
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                <EtiquetasCliente tipos={cliente.tipos} />
              </TableCell>
              <TableCell className="text-muted-foreground">{cliente.telefono ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{cliente.email ?? "—"}</TableCell>
              <TableCell>
                {proximo ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5",
                      vencido && "font-medium text-destructive"
                    )}
                  >
                    {vencido && <span aria-hidden className="size-1.5 rounded-full bg-destructive" />}
                    {format(proximo, "dd/MM/yyyy")}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
