"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Handshake, Lock } from "lucide-react";

import { crearOperacion } from "@/lib/actions/operaciones";
import { ClientePicker } from "@/components/shared/cliente-picker";
import { AffixInput, Field } from "@/components/shared/form";
import { Initials, ItemList, ItemRow, ListHeading } from "@/components/shared/item-list";
import { Button } from "@/components/ui/button";
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

  const esVenta = tipoOperacionSugerida === "VENTA";

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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {puedeCerrar ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-xl bg-accent/50 p-5 ring-1 ring-primary/15"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-[30%] bg-primary text-primary-foreground">
              <Handshake className="size-4" />
            </span>
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-semibold">Cerrar {esVenta ? "venta" : "alquiler"}</h3>
              <p className="text-xs text-muted-foreground">
                El inmueble pasará a {esVenta ? "vendido" : "alquilado"} y quedará en el historial.
              </p>
            </div>
          </div>
          <Field label={`Cliente ${esVenta ? "comprador" : "inquilino"}`}>
            <ClientePicker
              value={cliente?.id ?? null}
              valueLabel={cliente?.label}
              onChange={setCliente}
            />
          </Field>
          <Field label="Precio final" htmlFor="precioFinal">
            <AffixInput
              id="precioFinal"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              suffix="€"
              value={precioFinal}
              onChange={(e) => setPrecioFinal(e.target.value)}
              required
            />
          </Field>
          <Field label="Notas" htmlFor="notasOperacion" optional>
            <Textarea
              id="notasOperacion"
              rows={3}
              placeholder="Condiciones, arras, fecha de firma…"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </Field>
          <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto sm:self-end">
            {isPending ? "Guardando…" : `Cerrar ${esVenta ? "venta" : "alquiler"}`}
          </Button>
        </form>
      ) : (
        <div className="flex items-start gap-3 self-start rounded-xl bg-surface/70 p-5">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Este inmueble ya no está disponible, así que no admite nuevas operaciones.
            Cambia su estado desde «Editar» si necesitas reabrirlo.
          </p>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <ListHeading title="Historial de operaciones" count={operaciones.length} />
        {operaciones.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            Todavía no hay operaciones cerradas para este inmueble.
          </p>
        ) : (
          <ItemList>
            {operaciones.map((operacion) => (
              <ItemRow key={operacion.id} className="items-start">
                <Initials nombre={operacion.clienteNombre} />
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/clientes/${operacion.clienteId}`}
                    className="block truncate font-medium hover:text-primary"
                  >
                    {operacion.clienteNombre}
                  </Link>
                  <span className="block text-xs text-muted-foreground">
                    {TIPO_OPERACION_LABELS[operacion.tipoOperacion]} ·{" "}
                    <span className="tabular">{format(operacion.fecha, "dd/MM/yyyy")}</span>
                  </span>
                  {operacion.notas && (
                    <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
                      {operacion.notas}
                    </span>
                  )}
                </span>
                <span className="tabular shrink-0 font-medium">
                  {formatoPrecio.format(Number(operacion.precioFinal))}
                </span>
              </ItemRow>
            ))}
          </ItemList>
        )}
      </section>
    </div>
  );
}
