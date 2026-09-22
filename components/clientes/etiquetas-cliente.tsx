import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ordenarEtiquetas, TIPO_CLIENTE_LABELS } from "@/lib/validations/cliente";

/** A client's tags (Comprador, Inquilino, Propietario) as badges. */
export function EtiquetasCliente({ tipos, className }: { tipos: readonly string[]; className?: string }) {
  const etiquetas = ordenarEtiquetas(tipos);
  if (!etiquetas.length) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {etiquetas.map((e) => (
        <Badge key={e} variant="secondary">
          {TIPO_CLIENTE_LABELS[e]}
        </Badge>
      ))}
    </span>
  );
}

/** «Comprador · Propietario», for eyebrows and other plain-text spots. */
export function textoEtiquetas(tipos: readonly string[]) {
  return ordenarEtiquetas(tipos).map((e) => TIPO_CLIENTE_LABELS[e]).join(" · ");
}
