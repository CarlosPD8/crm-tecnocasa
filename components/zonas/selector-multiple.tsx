"use client";

import { ZonaPunto } from "@/components/zonas/zona-badge";

export type OpcionChip = { id: string; label: string; color?: string; detalle?: string };

/**
 * Chips to pick several options (advisors of a zone, zones of an advisor),
 * like the client tags. Checkboxes underneath, so it works with the keyboard.
 */
export function SelectorMultiple({
  opciones,
  value,
  onChange,
  etiqueta,
  vacio,
}: {
  opciones: OpcionChip[];
  value: string[];
  onChange: (ids: string[]) => void;
  etiqueta: string;
  vacio: string;
}) {
  if (!opciones.length) return <p className="text-sm text-muted-foreground">{vacio}</p>;
  return (
    <div role="group" aria-label={etiqueta} className="flex flex-wrap gap-2">
      {opciones.map((o) => {
        const marcada = value.includes(o.id);
        return (
          <label
            key={o.id}
            className="relative flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-[background-color,color,border-color,box-shadow] duration-200 hover:text-foreground has-checked:border-primary/40 has-checked:bg-accent has-checked:text-accent-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/40"
          >
            <input
              type="checkbox"
              checked={marcada}
              onChange={() => onChange(marcada ? value.filter((v) => v !== o.id) : [...value, o.id])}
              className="size-4 accent-primary"
            />
            {o.color && <ZonaPunto color={o.color} />}
            {o.label}
            {o.detalle && <span className="text-xs font-normal text-muted-foreground">{o.detalle}</span>}
          </label>
        );
      })}
    </div>
  );
}
