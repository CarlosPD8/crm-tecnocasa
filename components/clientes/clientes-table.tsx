import Link from "next/link";
import { Pencil, Eye, UserPlus, SearchX } from "lucide-react";
import { format, isPast, isToday } from "date-fns";

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
import { EmptyState } from "@/components/shared/empty-state";
import { EliminarClienteDialog } from "@/components/clientes/eliminar-cliente-dialog";
import { TIPO_CLIENTE_LABELS } from "@/lib/validations/cliente";
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
        description="Prueba con otro nombre, teléfono o quita alguno de los filtros."
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
          <TableHead className="text-right">
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clientes.map((cliente) => {
          const proximo = cliente.fechaProximoContacto;
          const vencido = proximo && (isToday(proximo) || isPast(proximo));
          return (
            <TableRow key={cliente.id} className="group/row">
              <TableCell>
                <Link
                  href={`/clientes/${cliente.id}`}
                  className="flex items-center gap-3 font-medium hover:text-primary"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-[30%] bg-secondary text-xs font-semibold text-secondary-foreground">
                    {`${cliente.nombre[0] ?? ""}${cliente.apellidos[0] ?? ""}`.toUpperCase()}
                  </span>
                  {cliente.nombre} {cliente.apellidos}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{TIPO_CLIENTE_LABELS[cliente.tipoCliente]}</Badge>
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
              <TableCell>
                <div className="flex justify-end gap-0.5 opacity-60 transition-opacity duration-200 group-hover/row:opacity-100 focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Ver cliente"
                    nativeButton={false}
                    render={
                      <Link href={`/clientes/${cliente.id}`}>
                        <Eye />
                      </Link>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Editar cliente"
                    nativeButton={false}
                    render={
                      <Link href={`/clientes/${cliente.id}/editar`}>
                        <Pencil />
                      </Link>
                    }
                  />
                  <EliminarClienteDialog
                    clienteId={cliente.id}
                    nombreCompleto={`${cliente.nombre} ${cliente.apellidos}`}
                  />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
