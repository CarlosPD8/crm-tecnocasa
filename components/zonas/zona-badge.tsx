import { cn } from "@/lib/utils";
import { colorZona } from "@/lib/validations/zona";

/** The zone's color swatch. Square, so it doesn't read as a status dot. */
export function ZonaPunto({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-2 shrink-0 rounded-[3px]", className)}
      style={{ backgroundColor: colorZona(color).valor }}
    />
  );
}

/** «■ Zaidín». An em dash when there's none (only before every row has a zone). */
export function ZonaBadge({
  zona,
  className,
}: {
  zona: { nombre: string; color: string } | null | undefined;
  className?: string;
}) {
  if (!zona) return <span className={cn("text-muted-foreground", className)}>—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-foreground", className)}>
      <ZonaPunto color={zona.color} />
      {zona.nombre}
    </span>
  );
}
