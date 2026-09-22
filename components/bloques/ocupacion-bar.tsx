import { cn } from "@/lib/utils";
import type { OcupacionForm } from "@/lib/validations/inmueble";
import type { ResumenOcupacion } from "@/lib/validations/bloque";

const COLOR: Record<OcupacionForm, string> = {
  INQUILINOS: "bg-warning",
  PROPIETARIO: "bg-primary",
  VACIO: "bg-muted-foreground/45",
  SIN_DATOS: "bg-border",
};

const ORDEN: OcupacionForm[] = ["PROPIETARIO", "INQUILINOS", "VACIO", "SIN_DATOS"];

// [singular, plural] so the summary reads «1 con inquilinos, 3 vacíos».
const FRASE: Record<OcupacionForm, [string, string]> = {
  PROPIETARIO: ["con propietario", "con propietario"],
  INQUILINOS: ["con inquilinos", "con inquilinos"],
  VACIO: ["vacío", "vacíos"],
  SIN_DATOS: ["sin datos", "sin datos"],
};

/** Stacked bar of how a block's flats are occupied, with an accessible text summary. */
export function OcupacionBar({ resumen, className }: { resumen: ResumenOcupacion; className?: string }) {
  const total = ORDEN.reduce((n, k) => n + resumen[k], 0);
  const texto = ORDEN.filter((k) => resumen[k] > 0)
    .map((k) => `${resumen[k]} ${FRASE[k][resumen[k] === 1 ? 0 : 1]}`)
    .join(", ");

  if (total === 0) return <span className="text-xs text-muted-foreground">Sin pisos</span>;

  return (
    <div className={cn("flex min-w-32 flex-col gap-1.5", className)}>
      <div className="flex h-1.5 w-full gap-px overflow-hidden rounded-full" role="img" aria-label={texto}>
        {ORDEN.map((k) =>
          resumen[k] > 0 ? (
            <span key={k} className={COLOR[k]} style={{ width: `${(resumen[k] / total) * 100}%` }} />
          ) : null
        )}
      </div>
      <span aria-hidden className="tabular truncate text-[0.7rem] text-muted-foreground">
        {texto}
      </span>
    </div>
  );
}
