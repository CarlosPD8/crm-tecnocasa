import { cn } from "@/lib/utils";
import { ESTADO_INMUEBLE_LABELS } from "@/lib/validations/inmueble";
import type { EstadoInmueble } from "@/lib/generated/prisma/client";

const ESTADO_DOT: Record<EstadoInmueble, string> = {
  DISPONIBLE: "bg-primary",
  RESERVADO: "bg-warning",
  VENDIDO: "bg-muted-foreground",
  ALQUILADO: "bg-muted-foreground",
};

export function EstadoBadge({ estado, className }: { estado: EstadoInmueble; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-foreground",
        className
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", ESTADO_DOT[estado])} />
      {ESTADO_INMUEBLE_LABELS[estado]}
    </span>
  );
}
