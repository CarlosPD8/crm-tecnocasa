import { format } from "date-fns";
import type { Contacto } from "@/lib/generated/prisma/client";

export function ContactosList({ contactos }: { contactos: Contacto[] }) {
  if (contactos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay contactos registrados.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {contactos.map((contacto) => (
        <li key={contacto.id} className="rounded-lg border p-3 text-sm">
          <p className="mb-1 text-xs text-muted-foreground">
            {format(contacto.fecha, "dd/MM/yyyy HH:mm")}
          </p>
          <p className="whitespace-pre-wrap">{contacto.nota}</p>
        </li>
      ))}
    </ul>
  );
}
