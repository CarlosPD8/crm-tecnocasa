import Link from "next/link";
import { Pencil, Eye } from "lucide-react";
import { format } from "date-fns";

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
import { EliminarClienteDialog } from "@/components/clientes/eliminar-cliente-dialog";
import { TIPO_CLIENTE_LABELS } from "@/lib/validations/cliente";
import type { Cliente } from "@/lib/generated/prisma/client";

export function ClientesTable({ clientes }: { clientes: Cliente[] }) {
  if (clientes.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No se han encontrado clientes.
      </p>
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
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clientes.map((cliente) => (
          <TableRow key={cliente.id}>
            <TableCell className="font-medium">
              {cliente.nombre} {cliente.apellidos}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">
                {TIPO_CLIENTE_LABELS[cliente.tipoCliente]}
              </Badge>
            </TableCell>
            <TableCell>{cliente.telefono ?? "—"}</TableCell>
            <TableCell>{cliente.email ?? "—"}</TableCell>
            <TableCell>
              {cliente.fechaProximoContacto
                ? format(cliente.fechaProximoContacto, "dd/MM/yyyy")
                : "—"}
            </TableCell>
            <TableCell className="flex justify-end gap-1">
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
