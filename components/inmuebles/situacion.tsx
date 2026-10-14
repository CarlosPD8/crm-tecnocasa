import { differenceInCalendarDays, format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Star, Target } from "lucide-react";

import { cn } from "@/lib/utils";
import { CAPTACION_LABELS, ocupacionLabel } from "@/lib/validations/inmueble";
import { hoyISO } from "@/lib/filtros/tipos";
import type { Captacion, Ocupacion } from "@/lib/generated/prisma/enums";

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

// A news item is the surer mark, so it gets the stronger color.
const CAPTACION_ESTILO = {
  POTENCIAL: { Icono: Target, badge: "bg-accent text-accent-foreground", icono: "" },
  NOTICIA: { Icono: Star, badge: "bg-primary text-primary-foreground", icono: "fill-current" },
} satisfies Record<Captacion, { Icono: typeof Star; badge: string; icono: string }>;

/** Acquisition mark (target = potential, star = news); nothing when unmarked. */
export function CaptacionBadge({
  captacion,
  className,
  compact = false,
}: {
  captacion: Captacion | null;
  className?: string;
  compact?: boolean;
}) {
  if (!captacion) return null;
  const { Icono, badge, icono } = CAPTACION_ESTILO[captacion];
  const etiqueta = CAPTACION_LABELS[captacion];
  return (
    <span
      title={etiqueta}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium tracking-normal normal-case",
        badge,
        className
      )}
    >
      <Icono aria-hidden className={cn("size-3", icono)} />
      {compact ? <span className="sr-only">{etiqueta}</span> : etiqueta}
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

/** Lease end: the date plus how far away it is (days counted in Spain's calendar). */
export function FinAlquiler({ fecha, className }: { fecha: Date | null; className?: string }) {
  if (!fecha) return <span className={cn("text-muted-foreground", className)}>—</span>;
  const dia = fecha.toISOString().slice(0, 10);
  const dias = differenceInCalendarDays(parseISO(dia), parseISO(hoyISO()));
  const [texto, tono] =
    dias < 0
      ? [`vencido hace ${-dias} ${dias === -1 ? "día" : "días"}`, "bg-destructive/10 text-destructive"]
      : dias === 0
        ? ["vence hoy", "bg-destructive/10 text-destructive"]
        : dias <= 90
          ? [`vence en ${dias} ${dias === 1 ? "día" : "días"}`, "bg-warning/15 text-foreground"]
          : [`en ${dias} días`, "bg-secondary text-secondary-foreground"];
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      <time dateTime={dia} className="tabular">
        {format(parseISO(dia), "dd/MM/yyyy")}
      </time>
      <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium", tono)}>{texto}</span>
    </span>
  );
}
