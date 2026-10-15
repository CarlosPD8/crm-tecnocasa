"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ZonaPunto } from "@/components/zonas/zona-badge";
import type { OpcionZona } from "@/lib/db";

/** Zone picker for blocks and loose properties: the user's zones (all, for a director). */
export function ZonaSelect({
  value,
  onChange,
  zonas,
  invalid,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  zonas: OpcionZona[];
  invalid?: boolean;
  id?: string;
}) {
  const items = Object.fromEntries(zonas.map((z) => [z.id, z.nombre]));

  return (
    <Select items={items} value={value || null} onValueChange={(v) => onChange(v ? String(v) : "")}>
      <SelectTrigger id={id} className="w-full" aria-label="Zona" aria-invalid={invalid}>
        <SelectValue placeholder="Elige una zona" />
      </SelectTrigger>
      <SelectContent>
        {zonas.map((z) => (
          <SelectItem key={z.id} value={z.id}>
            <ZonaPunto color={z.color} />
            {z.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
