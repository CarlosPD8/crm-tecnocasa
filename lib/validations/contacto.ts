import { z } from "zod";

export const contactoSchema = z.object({
  nota: z.string().min(1, "La nota es obligatoria"),
});

export type ContactoInput = z.infer<typeof contactoSchema>;
