"use client";

import { useState, useTransition } from "react";
import { KeyRound, MoreHorizontal, Pencil, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { cambiarActivo } from "@/lib/actions/equipo";
import { ROL_LABELS } from "@/lib/validations/usuario";
import type { RolUsuario } from "@/lib/generated/prisma/enums";
import { EditarUsuarioDialog, type UsuarioEditable } from "@/components/equipo/usuario-dialog";
import { RestablecerPasswordDialog } from "@/components/equipo/password-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type MiembroEquipo = {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  debeCambiarPassword: boolean;
  esYo: boolean;
  clientes: number;
  inmuebles: number;
};

function Estado({ miembro }: { miembro: MiembroEquipo }) {
  if (!miembro.activo) return <Badge variant="outline" className="text-muted-foreground">Desactivado</Badge>;
  if (miembro.debeCambiarPassword) return <Badge variant="secondary">Pendiente de primer acceso</Badge>;
  return <Badge>Activo</Badge>;
}

export function EquipoTable({ miembros }: { miembros: MiembroEquipo[] }) {
  const [editando, setEditando] = useState<UsuarioEditable | null>(null);
  const [restableciendo, setRestableciendo] = useState<MiembroEquipo | null>(null);
  const [desactivando, setDesactivando] = useState<MiembroEquipo | null>(null);
  const [isPending, startTransition] = useTransition();

  function activar(miembro: MiembroEquipo, activo: boolean) {
    startTransition(async () => {
      const result = await cambiarActivo(miembro.id, activo);
      setDesactivando(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if ("aviso" in result && result.aviso) toast.warning(result.aviso);
      else toast.success(activo ? `${miembro.nombre} vuelve a tener acceso.` : `${miembro.nombre} ya no tiene acceso.`);
    });
  }

  return (
    <>
      <div className="rise overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-foreground/6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Persona</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Clientes</TableHead>
              <TableHead className="text-right">Inmuebles</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {miembros.map((m) => (
              <TableRow key={m.id} className={cn(!m.activo && "opacity-60")}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-[30%] bg-secondary text-xs font-semibold text-secondary-foreground">
                      {(m.nombre[0] ?? "?").toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {m.nombre}
                        {m.esYo && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(tú)</span>}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{m.email}</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell>{ROL_LABELS[m.rol]}</TableCell>
                <TableCell>
                  <Estado miembro={m} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{m.clientes}</TableCell>
                <TableCell className="text-right tabular-nums">{m.inmuebles}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`Acciones para ${m.nombre}`}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => setEditando({ id: m.id, nombre: m.nombre, rol: m.rol, esYo: m.esYo })}>
                        <Pencil /> Editar nombre y rol
                      </DropdownMenuItem>
                      {!m.esYo && (
                        <>
                          <DropdownMenuItem onClick={() => setRestableciendo(m)} disabled={!m.activo}>
                            <KeyRound /> Restablecer contraseña
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {m.activo ? (
                            <DropdownMenuItem variant="destructive" onClick={() => setDesactivando(m)}>
                              <UserX /> Desactivar acceso
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => activar(m, true)} disabled={isPending}>
                              <UserCheck /> Reactivar acceso
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditarUsuarioDialog usuario={editando} onClose={() => setEditando(null)} />
      <RestablecerPasswordDialog persona={restableciendo} onClose={() => setRestableciendo(null)} />

      <AlertDialog open={desactivando !== null} onOpenChange={(open) => !open && setDesactivando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar a {desactivando?.nombre}?</AlertDialogTitle>
            <AlertDialogDescription>
              Perderá el acceso al CRM en ese mismo momento. Todo lo que creó se conserva con su nombre, y sus
              clientes e inmuebles siguen asignados a esa persona hasta que los reasignes. Puedes devolverle el acceso cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={() => desactivando && activar(desactivando, false)}
            >
              {isPending ? "Desactivando…" : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
