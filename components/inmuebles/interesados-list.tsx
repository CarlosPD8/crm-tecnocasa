"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { format } from "date-fns";

import { agregarInteres, quitarInteres } from "@/lib/actions/intereses";
import { ClientePicker } from "@/components/shared/cliente-picker";
import { Initials, ItemList, ItemRow, ListHeading } from "@/components/shared/item-list";
import { Button } from "@/components/ui/button";

export type InteresadoItem = {
  id: string;
  clienteId: string;
  clienteNombre: string;
  fecha: Date;
};

export function InteresadosList({
  inmuebleId,
  interesados,
}: {
  inmuebleId: string;
  interesados: InteresadoItem[];
}) {
  const [nuevoCliente, setNuevoCliente] = useState<{ id: string; label: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  function handleAgregar() {
    if (!nuevoCliente) return;
    startTransition(async () => {
      const result = await agregarInteres(inmuebleId, nuevoCliente.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Cliente marcado como interesado.");
      setNuevoCliente(null);
    });
  }

  function handleQuitar(interesId: string) {
    startTransition(async () => {
      const result = await quitarInteres(interesId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Interés eliminado.");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-xl bg-surface/60 p-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <ClientePicker
            value={nuevoCliente?.id ?? null}
            valueLabel={nuevoCliente?.label}
            onChange={setNuevoCliente}
            placeholder="Buscar cliente para marcar interés…"
          />
        </div>
        <Button type="button" disabled={!nuevoCliente || isPending} onClick={handleAgregar}>
          <Plus /> Añadir interesado
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <ListHeading title="Clientes interesados" count={interesados.length} />
        {interesados.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            Nadie ha mostrado interés todavía. Añade clientes con el buscador de arriba
            para tenerlos a mano cuando haya novedades.
          </p>
        ) : (
          <ItemList>
            {interesados.map((interesado) => (
              <ItemRow key={interesado.id}>
                <Initials nombre={interesado.clienteNombre} />
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/clientes/${interesado.clienteId}`}
                    className="block truncate font-medium hover:text-primary"
                  >
                    {interesado.clienteNombre}
                  </Link>
                  <span className="block text-xs text-muted-foreground">
                    Interesado desde el {format(interesado.fecha, "dd/MM/yyyy")}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Quitar interés de ${interesado.clienteNombre}`}
                  disabled={isPending}
                  onClick={() => handleQuitar(interesado.id)}
                  className="text-muted-foreground opacity-60 group-hover/item:opacity-100 hover:text-destructive focus-visible:opacity-100"
                >
                  <X />
                </Button>
              </ItemRow>
            ))}
          </ItemList>
        )}
      </div>
    </div>
  );
}
