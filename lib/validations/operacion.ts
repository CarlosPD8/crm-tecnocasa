import { z } from "zod";
import { TipoOperacion } from "@/lib/generated/prisma/enums";

export const operacionSchema = z.object({
  clienteId: z.string().min(1, "Selecciona un cliente"),
  tipoOperacion: z.nativeEnum(TipoOperacion),
  precioFinal: z
    .string()
    .min(1, "El precio es obligatorio")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Precio no válido"),
  notas: z.string().optional().or(z.literal("")),
});

export type OperacionInput = z.infer<typeof operacionSchema>;
