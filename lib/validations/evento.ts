import { z } from "zod";

export const TIPO_EVENTO_LABELS = {
  VISITA: "Visita",
  REUNION: "Reunión",
  LLAMADA: "Llamada",
  FIRMA: "Firma",
  OTRO: "Otro",
} as const;

export type TipoEvento = keyof typeof TIPO_EVENTO_LABELS;

const TIPOS = Object.keys(TIPO_EVENTO_LABELS) as [TipoEvento, ...TipoEvento[]];

/** «2026-09-22»: an all-day date, independent of any time zone. */
export const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Wire format shared by the form and drag & drop:
 * - all-day: `inicio`/`fin` are "yyyy-MM-dd" and `fin` is exclusive (like iCal);
 * - timed: `inicio`/`fin` are ISO instants.
 */
const fechasSchema = z
  .object({
    todoElDia: z.boolean(),
    inicio: z.string().min(1, "Indica cuándo empieza"),
    fin: z.string().min(1, "Indica cuándo termina"),
  })
  .superRefine((v, ctx) => {
    const valida = (s: string) =>
      v.todoElDia ? DIA_RE.test(s) : !Number.isNaN(Date.parse(s));
    if (!valida(v.inicio)) ctx.addIssue({ code: "custom", path: ["inicio"], message: "Fecha no válida" });
    if (!valida(v.fin)) ctx.addIssue({ code: "custom", path: ["fin"], message: "Fecha no válida" });
    if (valida(v.inicio) && valida(v.fin)) {
      const inicio = aFecha(v.inicio, v.todoElDia).getTime();
      const fin = aFecha(v.fin, v.todoElDia).getTime();
      if (v.todoElDia ? fin <= inicio : fin < inicio) {
        ctx.addIssue({ code: "custom", path: ["fin"], message: "Debe terminar después de empezar" });
      }
    }
  });

export const moverEventoSchema = fechasSchema;
export type MoverEventoInput = z.infer<typeof moverEventoSchema>;

export const eventoSchema = z
  .object({
    titulo: z.string().trim().min(1, "El título es obligatorio").max(120, "Máximo 120 caracteres"),
    tipo: z.enum(TIPOS),
    notas: z.string().max(2000).optional().or(z.literal("")),
    clienteId: z.string().optional().or(z.literal("")),
    inmuebleId: z.string().optional().or(z.literal("")),
  })
  .and(fechasSchema);

export type EventoInput = z.infer<typeof eventoSchema>;

/** Wire value → the instant stored in the database (all-day dates at UTC midnight). */
export function aFecha(valor: string, todoElDia: boolean) {
  return todoElDia ? new Date(`${valor}T00:00:00.000Z`) : new Date(valor);
}

/** Stored instant → wire value. */
export function aValor(fecha: Date, todoElDia: boolean) {
  return todoElDia ? fecha.toISOString().slice(0, 10) : fecha.toISOString();
}

/** What the calendar shows, whatever table it comes from. */
export type FuenteCalendario = "evento" | "proximo" | "contacto" | "operacion" | "finAlquiler";

export const FUENTE_LABELS: Record<FuenteCalendario, string> = {
  evento: "Eventos",
  proximo: "Próximos contactos",
  contacto: "Contactos hechos",
  operacion: "Operaciones",
  finAlquiler: "Fin de alquiler",
};

export type ItemCalendario = {
  id: string;
  fuente: FuenteCalendario;
  titulo: string;
  todoElDia: boolean;
  inicio: string;
  fin: string | null;
  tipo?: TipoEvento;
  notas?: string | null;
  cliente?: { id: string; nombre: string } | null;
  inmueble?: { id: string; referencia: string } | null;
  /** Who created the event or logged the contact/deal (null for older records). */
  autor?: string | null;
  /** Events only: directors delete any, advisors their own. */
  puedeEliminar?: boolean;
};
