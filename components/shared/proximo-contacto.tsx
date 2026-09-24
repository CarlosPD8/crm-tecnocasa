"use client";

import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock } from "lucide-react";

import { cn } from "@/lib/utils";
import { hoyISO } from "@/lib/filtros/tipos";

/** Day `dia` (yyyy-MM-dd) moved by some days or months, in calendar terms. */
function sumar(dia: string, { dias = 0, meses = 0 }: { dias?: number; meses?: number }) {
  const d = new Date(`${dia}T00:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + meses);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const ATAJOS = [
  { etiqueta: "Mañana", dias: 1 },
  { etiqueta: "En 3 días", dias: 3 },
  { etiqueta: "En 1 semana", dias: 7 },
  { etiqueta: "En 2 semanas", dias: 14 },
  { etiqueta: "En 1 mes", meses: 1 },
  { etiqueta: "En 3 meses", meses: 3 },
] as const;

function fechaLarga(dia: string) {
  return format(parseISO(dia), "EEEE d 'de' MMMM", { locale: es });
}

const chip =
  "inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium ring-1 transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none";
const chipInactivo = "bg-card text-muted-foreground ring-border hover:bg-accent hover:text-foreground";
const chipActivo = "bg-primary text-primary-foreground ring-primary";

/**
 * «When do we call again?» picked while logging a contact: one-tap shortcuts
 * plus any other date. What is shown is what gets saved; "" means nothing
 * scheduled. `actual` is the stored date, to explain what happens to it.
 */
export function ProximoContactoPicker({
  value,
  onChange,
  actual,
}: {
  value: string;
  onChange: (value: string) => void;
  actual?: string | null;
}) {
  const hoy = hoyISO();
  const manana = sumar(hoy, { dias: 1 });

  let resumen: string;
  if (value) resumen = `Volverá a salir en «Por contactar» el ${fechaLarga(value)}.`;
  else if (actual && actual > hoy) resumen = `Sin fecha: se quita el contacto previsto para el ${fechaLarga(actual)}.`;
  else if (actual) resumen = "Sin fecha: deja de estar pendiente de contacto.";
  else resumen = "Sin próximo contacto.";

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 flex items-center gap-1.5 text-xs font-medium">
        <CalendarClock className="size-3.5 text-muted-foreground" />
        ¿Cuándo volver a contactar?
      </legend>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={!value}
          onClick={() => onChange("")}
          className={cn(chip, !value ? chipActivo : chipInactivo)}
        >
          Sin fecha
        </button>
        {ATAJOS.map((a) => {
          const dia = sumar(hoy, { dias: "dias" in a ? a.dias : 0, meses: "meses" in a ? a.meses : 0 });
          const activo = value === dia;
          return (
            <button
              key={a.etiqueta}
              type="button"
              aria-pressed={activo}
              title={fechaLarga(dia)}
              onClick={() => onChange(dia)}
              className={cn(chip, activo ? chipActivo : chipInactivo)}
            >
              {a.etiqueta}
            </button>
          );
        })}
        <input
          type="date"
          aria-label="Otra fecha de próximo contacto"
          min={manana}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(chip, "tabular bg-card text-foreground ring-border [color-scheme:light] dark:[color-scheme:dark]")}
        />
      </div>
      <p className="text-xs text-muted-foreground first-letter:uppercase" aria-live="polite">
        {resumen}
      </p>
    </fieldset>
  );
}

/** Stored follow-up for a detail page: the date plus how far away it is. */
export function ProximoContacto({ fecha, className }: { fecha: Date | null; className?: string }) {
  if (!fecha) return <span className={cn("text-muted-foreground", className)}>—</span>;
  const dia = fecha.toISOString().slice(0, 10);
  const dias = differenceInCalendarDays(parseISO(dia), parseISO(hoyISO()));
  const [texto, tono] =
    dias < 0
      ? [`vencido hace ${-dias} ${dias === -1 ? "día" : "días"}`, "bg-destructive/10 text-destructive"]
      : dias === 0
        ? ["hoy", "bg-destructive/10 text-destructive"]
        : dias === 1
          ? ["mañana", "bg-accent text-accent-foreground"]
          : [`en ${dias} días`, "bg-secondary text-secondary-foreground"];
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      <span className="tabular">{format(parseISO(dia), "dd/MM/yyyy")}</span>
      <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", tono)}>{texto}</span>
    </span>
  );
}
