import { z } from "zod";

export const contactoSchema = z.object({
  nota: z.string().min(1, "La nota es obligatoria"),
});

export type ContactoInput = z.infer<typeof contactoSchema>;

// Contact logged from a property page: optionally tied to the person spoken to
// (the owner by default), so it also shows up in that client's history.
export const contactoInmuebleSchema = contactoSchema.extend({
  clienteId: z.string().optional().or(z.literal("")),
});

export type ContactoInmuebleInput = z.infer<typeof contactoInmuebleSchema>;
