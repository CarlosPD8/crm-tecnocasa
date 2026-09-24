import { z } from "zod";

export const contactoSchema = z.object({
  nota: z.string().min(1, "La nota es obligatoria"),
  // Next follow-up chosen while logging the contact: "yyyy-MM-dd", "" to leave
  // nothing scheduled, or absent to keep the current date untouched.
  fechaProximoContacto: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha no válida"),
});

export type ContactoInput = z.infer<typeof contactoSchema>;

// Contact logged from a property page: optionally tied to the person spoken to
// (the owner by default), so it also shows up in that client's history.
export const contactoInmuebleSchema = contactoSchema.extend({
  clienteId: z.string().optional().or(z.literal("")),
});

export type ContactoInmuebleInput = z.infer<typeof contactoInmuebleSchema>;

/** Follow-up field → what to write: undefined keeps the stored date. */
export function proximoContactoData(valor: string | undefined) {
  if (valor === undefined) return {};
  return { fechaProximoContacto: valor ? new Date(`${valor}T00:00:00.000Z`) : null };
}
