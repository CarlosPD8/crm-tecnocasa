"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { format } from "date-fns";

import { agregarInteres, quitarInteres } from "@/lib/actions/intereses";
import { ClientePicker } from "@/components/shared/cliente-picker";
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
        toast.error("No se pudo quitar el interés.");
        return;
      }
      toast.success("Interés eliminado.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <ClientePicker
            value={nuevoCliente?.id ?? null}
            valueLabel={nuevoCliente?.label}
            onChange={setNuevoCliente}
            placeholder="Buscar cliente para marcar interés..."
          />
        </div>
        <Button type="button" disabled={!nuevoCliente || isPending} onClick={handleAgregar}>
          Añadir
        </Button>
      </div>

      {interesados.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay clientes interesados en este inmueble.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {interesados.map((interesado) => (
            <li
              key={interesado.id}
              className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm"
            >
              <div>
                <Link
                  href={`/clientes/${interesado.clienteId}`}
                  className="font-medium hover:underline"
                >
                  {interesado.clienteNombre}
                </Link>
                <span className="ml-2 text-xs text-muted-foreground">
                  desde {format(interesado.fecha, "dd/MM/yyyy")}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Quitar interés"
                disabled={isPending}
                onClick={() => handleQuitar(interesado.id)}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
