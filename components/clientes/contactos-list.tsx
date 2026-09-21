import { format, formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import type { Contacto } from "@/lib/generated/prisma/client";

export function ContactosList({ contactos }: { contactos: Contacto[] }) {
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
