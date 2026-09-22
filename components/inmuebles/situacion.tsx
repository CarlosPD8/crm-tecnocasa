import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { Target } from "lucide-react";

import { cn } from "@/lib/utils";
import { ocupacionLabel } from "@/lib/validations/inmueble";
import type { Ocupacion } from "@/lib/generated/prisma/enums";

const OCUPACION_DOT: Record<Ocupacion | "SIN_DATOS", string> = {
  INQUILINOS: "bg-warning",
  PROPIETARIO: "bg-primary",
  VACIO: "border border-muted-foreground bg-transparent",
  SIN_DATOS: "border border-dashed border-muted-foreground/60 bg-transparent",
};

export function OcupacionBadge({
  ocupacion,
  className,
}: {
  ocupacion: Ocupacion | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        ocupacion ? "text-foreground" : "text-muted-foreground",
        className
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", OCUPACION_DOT[ocupacion ?? "SIN_DATOS"])} />
      {ocupacionLabel(ocupacion)}
    </span>
  );
}

export function PotencialBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span
      title="Adquisición potencial"
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-[0.7rem] font-medium tracking-normal text-accent-foreground normal-case",
        className
      )}
    >
      <Target aria-hidden className="size-3" />
      {compact ? <span className="sr-only">Adquisición potencial</span> : "Adquisición potencial"}
    </span>
  );
}

/** «hace 3 días» with the exact date on hover, or an em dash when never contacted. */
export function UltimoContacto({ fecha, className }: { fecha: Date | null; className?: string }) {
  if (!fecha) return <span className={cn("text-muted-foreground", className)}>—</span>;
  return (
    <time
      dateTime={fecha.toISOString()}
      title={fecha.toLocaleString("es-ES")}
      className={className}
    >
      hace {formatDistanceToNowStrict(fecha, { locale: es })}
    </time>
  );
}
