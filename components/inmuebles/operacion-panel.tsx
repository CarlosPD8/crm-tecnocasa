"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";

import { crearOperacion } from "@/lib/actions/operaciones";
import { ClientePicker } from "@/components/shared/cliente-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TIPO_OPERACION_LABELS } from "@/lib/validations/inmueble";
import type { TipoOperacion } from "@/lib/generated/prisma/enums";

export type OperacionItem = {
  id: string;
  clienteId: string;
  clienteNombre: string;
  tipoOperacion: TipoOperacion;
  fecha: Date;
  precioFinal: string;
  notas: string | null;
};

const formatoPrecio = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function OperacionPanel({
  inmuebleId,
  tipoOperacionSugerida,
  puedeCerrar,
  operaciones,
}: {
  inmuebleId: string;
  tipoOperacionSugerida: TipoOperacion;
  puedeCerrar: boolean;
  operaciones: OperacionItem[];
}) {
  const [cliente, setCliente] = useState<{ id: string; label: string } | null>(null);
  const [precioFinal, setPrecioFinal] = useState("");
  const [notas, setNotas] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cliente) {
      toast.error("Selecciona un cliente.");
      return;
    }

    startTransition(async () => {
      const result = await crearOperacion(inmuebleId, {
        clienteId: cliente.id,
        tipoOperacion: tipoOperacionSugerida,
        precioFinal,
        notas,
      });

      if (!result.success) {
        const primerError = Object.values(result.error).flat()[0];
        toast.error(primerError ?? "No se pudo registrar la operación.");
        return;
      }

      toast.success("Operación cerrada. El inmueble se ha actualizado.");
      setCliente(null);
      setPrecioFinal("");
      setNotas("");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {puedeCerrar && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm font-medium">
            Cerrar {tipoOperacionSugerida === "VENTA" ? "venta" : "alquiler"}
          </p>
          <div className="flex flex-col gap-2">
            <Label>Cliente {tipoOperacionSugerida === "VENTA" ? "comprador" : "inquilino"}</Label>
            <ClientePicker
              value={cliente?.id ?? null}
              valueLabel={cliente?.label}
              onChange={setCliente}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="precioFinal">Precio final (€)</Label>
            <Input
              id="precioFinal"
              type="number"
              step="0.01"
              min="0"
              value={precioFinal}
              onChange={(e) => setPrecioFinal(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notasOperacion">Notas</Label>
            <Textarea
              id="notasOperacion"
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Cerrar operación"}
            </Button>
          </div>
        </form>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">Historial de operaciones</p>
        {operaciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay operaciones cerradas para este inmueble.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {operaciones.map((operacion) => (
              <li key={operacion.id} className="rounded-lg border p-3 text-sm">
                <p>
                  <Link
                    href={`/clientes/${operacion.clienteId}`}
                    className="font-medium hover:underline"
                  >
                    {operacion.clienteNombre}
                  </Link>{" "}
                  — {TIPO_OPERACION_LABELS[operacion.tipoOperacion]} —{" "}
                  {formatoPrecio.format(Number(operacion.precioFinal))} —{" "}
                  {format(operacion.fecha, "dd/MM/yyyy")}
                </p>
                {operacion.notas && (
                  <p className="mt-1 text-xs text-muted-foreground">{operacion.notas}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
