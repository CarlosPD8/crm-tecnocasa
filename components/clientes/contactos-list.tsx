import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";

export type ContactoItem = {
  id: string;
  fecha: Date;
  nota: string;
  cliente?: { id: string; nombre: string; apellidos: string } | null;
  inmueble?: { id: string; referencia: string } | null;
};

/**
 * Timeline of contacts. `contexto` says which page we are on, so each entry
 * links to the *other* side: «sobre GR-2401» in a client, «con Lucía…» in a property.
 */
export function ContactosList({
  contactos,
  contexto = "cliente",
}: {
  contactos: ContactoItem[];
  contexto?: "cliente" | "inmueble";
}) {
  if (contactos.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Todavía no hay contactos registrados. La primera nota aparecerá aquí.
      </p>
    );
  }

  return (
    <ol className="relative flex flex-col">
      <span aria-hidden className="absolute top-2 bottom-2 left-1.25 w-px bg-border" />
      {contactos.map((contacto, index) => (
        <li key={contacto.id} className="relative flex gap-4 pb-6 last:pb-0">
          <span
            aria-hidden
            className={
              index === 0
                ? "relative mt-1.5 size-2.75 shrink-0 rounded-full bg-primary ring-4 ring-card"
                : "relative mt-1.5 size-2.75 shrink-0 rounded-full border-2 border-border bg-card ring-4 ring-card"
            }
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="flex flex-wrap items-baseline gap-x-2 text-xs">
              <time dateTime={contacto.fecha.toISOString()} className="font-medium text-foreground">
                {format(contacto.fecha, "d MMM yyyy, HH:mm", { locale: es })}
              </time>
              <span className="text-muted-foreground">
                hace {formatDistanceToNowStrict(contacto.fecha, { locale: es })}
              </span>
              {contexto === "cliente" && contacto.inmueble && (
                <Link
                  href={`/inmuebles/${contacto.inmueble.id}`}
                  className="rounded-md bg-secondary px-1.5 py-px text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  sobre <span className="font-mono">{contacto.inmueble.referencia}</span>
                </Link>
              )}
              {contexto === "inmueble" && contacto.cliente && (
                <Link
                  href={`/clientes/${contacto.cliente.id}`}
                  className="rounded-md bg-secondary px-1.5 py-px text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  con {contacto.cliente.nombre} {contacto.cliente.apellidos}
                </Link>
              )}
            </p>
            <p className="max-w-[70ch] text-sm leading-relaxed whitespace-pre-wrap">
              {contacto.nota}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
