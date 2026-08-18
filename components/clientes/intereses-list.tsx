import { format } from "date-fns";
import type { Interes, Operacion, Inmueble } from "@/lib/generated/prisma/client";

type InteresConInmueble = Interes & { inmueble: Inmueble };
type OperacionConInmueble = Operacion & { inmueble: Inmueble };

export function InteresesList({
  intereses,
  operaciones,
}: {
  intereses: InteresConInmueble[];
  operaciones: OperacionConInmueble[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-medium">Inmuebles de interés</h3>
        {intereses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay inmuebles marcados como de interés. Esto se gestiona desde
            la ficha del inmueble.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {intereses.map((interes) => (
              <li key={interes.id} className="rounded-lg border p-2 text-sm">
                {interes.inmueble.referencia} — {interes.inmueble.direccion}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Operaciones cerradas</h3>
        {operaciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay operaciones cerradas con este cliente.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {operaciones.map((operacion) => (
              <li key={operacion.id} className="rounded-lg border p-2 text-sm">
                {operacion.inmueble.referencia} — {operacion.tipoOperacion} —{" "}
                {format(operacion.fecha, "dd/MM/yyyy")} —{" "}
                {operacion.precioFinal.toString()} €
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
