import Link from "next/link";
import { format } from "date-fns";
import { ArrowUpRight } from "lucide-react";

import { ItemList, ItemRow, ListHeading } from "@/components/shared/item-list";
import { EstadoBadge } from "@/components/inmuebles/estado-badge";
import { TIPO_OPERACION_LABELS } from "@/lib/validations/inmueble";
import type { Interes, Operacion, Inmueble } from "@/lib/generated/prisma/client";

type InteresConInmueble = Interes & { inmueble: Inmueble };
type OperacionConInmueble = Operacion & { inmueble: Inmueble };

const formatoPrecio = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function InteresesList({
  intereses,
  operaciones,
}: {
  intereses: InteresConInmueble[];
  operaciones: OperacionConInmueble[];
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="flex flex-col gap-3">
        <ListHeading title="Inmuebles de interés" count={intereses.length} />
        {intereses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            Ningún inmueble marcado todavía. El interés se añade desde la pestaña
            «Interesados» de cada inmueble.
          </p>
        ) : (
          <ItemList>
            {intereses.map((interes) => (
              <ItemRow key={interes.id} className="p-0">
                <Link
                  href={`/inmuebles/${interes.inmuebleId}`}
                  className="flex min-w-0 flex-1 items-center gap-3.5 px-4 py-3"
                >
                  <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                    {interes.inmueble.referencia}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{interes.inmueble.direccion}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {interes.inmueble.localidad} · desde {format(interes.fecha, "dd/MM/yyyy")}
                    </span>
                  </span>
                  <EstadoBadge estado={interes.inmueble.estado} className="shrink-0" />
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100" />
                </Link>
              </ItemRow>
            ))}
          </ItemList>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <ListHeading title="Operaciones cerradas" count={operaciones.length} />
        {operaciones.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            No hay operaciones cerradas con este cliente.
          </p>
        ) : (
          <ItemList>
            {operaciones.map((operacion) => (
              <ItemRow key={operacion.id} className="p-0">
                <Link
                  href={`/inmuebles/${operacion.inmuebleId}`}
                  className="flex min-w-0 flex-1 items-center gap-3.5 px-4 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {TIPO_OPERACION_LABELS[operacion.tipoOperacion]} ·{" "}
                      <span className="font-mono text-xs">{operacion.inmueble.referencia}</span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {operacion.inmueble.direccion}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="tabular block font-medium">
                      {formatoPrecio.format(Number(operacion.precioFinal))}
                    </span>
                    <span className="tabular block text-xs text-muted-foreground">
                      {format(operacion.fecha, "dd/MM/yyyy")}
                    </span>
                  </span>
                </Link>
              </ItemRow>
            ))}
          </ItemList>
        )}
      </section>
    </div>
  );
}
