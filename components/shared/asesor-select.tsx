"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OpcionAsesor } from "@/lib/db";

// The select can't hold "" as a value; this stands for «no advisor».
const NINGUNO = "__ninguno__";

/**
 * Advisor picker for directors. Lists the office's active users, plus the
 * current advisor if they have since been deactivated.
 */
export function AsesorSelect({
  value,
  onChange,
  asesores,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  asesores: OpcionAsesor[];
  invalid?: boolean;
}) {
  const visibles = asesores.filter((a) => a.activo || a.id === value);
  const items: Record<string, string> = {
    [NINGUNO]: "Sin asesor",
    ...Object.fromEntries(visibles.map((a) => [a.id, a.activo ? a.nombre : `${a.nombre} (desactivado)`])),
  };

  return (
    <Select
      items={items}
      value={value || NINGUNO}
      onValueChange={(v) => onChange(!v || v === NINGUNO ? "" : String(v))}
    >
      <SelectTrigger className="w-full" aria-label="Asesor responsable" aria-invalid={invalid}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(items).map(([id, nombre]) => (
          <SelectItem key={id} value={id}>
            {nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
