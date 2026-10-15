import type { AccionActividad } from "@/lib/generated/prisma/enums";

/** Kinds of line in the activity log, as the «Tipo» filter and the Excel name them. */
export const ACCION_LABELS: Record<AccionActividad, string> = {
  ENTRADA: "Entradas",
  CONTACTO: "Contactos",
  ALTA: "Altas",
  CAMBIO: "Cambios",
  BAJA: "Borrados",
  OPERACION: "Operaciones",
};
