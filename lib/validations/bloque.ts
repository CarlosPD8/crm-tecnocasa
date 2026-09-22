import { z } from "zod";
import type { OcupacionForm } from "@/lib/validations/inmueble";

/** How many flats of a block fall in each occupancy bucket. */
export type ResumenOcupacion = Record<OcupacionForm, number>;

export const RESUMEN_VACIO: ResumenOcupacion = { INQUILINOS: 0, PROPIETARIO: 0, VACIO: 0, SIN_DATOS: 0 };

export const bloqueSchema = z.object({
  calle: z.string().trim().min(1, "La calle es obligatoria"),
  numero: z.string().trim().min(1, "El número es obligatorio"),
  localidad: z.string().trim().min(1, "La localidad es obligatoria"),
  nombre: z.string().optional().or(z.literal("")),
  codigoPostal: z.string().optional().or(z.literal("")),
  notas: z.string().optional().or(z.literal("")),
});

export type BloqueInput = z.infer<typeof bloqueSchema>;

/** «C/ Estrellas 22» */
export function formatBloque(bloque: { calle: string; numero: string }) {
  return `${bloque.calle} ${bloque.numero}`;
}
