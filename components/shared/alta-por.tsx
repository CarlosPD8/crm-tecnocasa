import { format } from "date-fns";

/** «Marta Ruiz · 12/09/2026»; records from before authorship existed show only the date. */
export function AltaPor({ nombre, fecha }: { nombre?: string | null; fecha: Date }) {
  return (
    <span>
      {nombre ?? <span className="text-muted-foreground">Sin registrar</span>}
      <span className="tabular text-muted-foreground"> · {format(fecha, "dd/MM/yyyy")}</span>
    </span>
  );
}
