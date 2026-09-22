"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowUpRight } from "lucide-react";

import type { ItemCalendario } from "@/lib/validations/evento";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ENCABEZADO = {
  proximo: "Próximo contacto",
  contacto: "Contacto registrado",
  operacion: "Operación cerrada",
  evento: "Evento",
} as const;

/** Read-only view of what the calendar pulls from the CRM (follow-ups, contacts, deals). */
export function DetalleDialog({ item, onClose }: { item: ItemCalendario | null; onClose: () => void }) {
  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">{item && <Detalle item={item} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

function Detalle({ item, onClose }: { item: ItemCalendario; onClose: () => void }) {
  const fecha = item.todoElDia
    ? format(parseISO(item.inicio), "EEEE d 'de' MMMM", { locale: es })
    : format(parseISO(item.inicio), "EEEE d 'de' MMMM · HH:mm", { locale: es });

  return (
    <>
      <DialogHeader>
        <p className="eyebrow">{ENCABEZADO[item.fuente]}</p>
        <DialogTitle className="text-base">{item.titulo}</DialogTitle>
        <DialogDescription className="first-letter:uppercase">{fecha}</DialogDescription>
      </DialogHeader>

      {item.notas && (
        <p className="rounded-lg bg-surface px-3 py-2.5 text-sm whitespace-pre-line">
          {item.fuente === "proximo" ? `Teléfono: ${item.notas}` : item.notas}
        </p>
      )}

      {item.fuente === "proximo" && (
        <p className="text-xs text-muted-foreground">
          Arrástralo a otro día en el calendario para cambiar la fecha del próximo contacto.
        </p>
      )}

      <DialogFooter className="gap-2">
        {item.inmueble && (
          <Button variant="outline" nativeButton={false} render={<Link href={`/inmuebles/${item.inmueble.id}`} onClick={onClose} />}>
            {item.inmueble.referencia} <ArrowUpRight />
          </Button>
        )}
        {item.cliente && (
          <Button nativeButton={false} render={<Link href={`/clientes/${item.cliente.id}`} onClick={onClose} />}>
            {item.fuente === "proximo" ? "Abrir ficha y registrar" : item.cliente.nombre} <ArrowUpRight />
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
