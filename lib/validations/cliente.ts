import { z } from "zod";
import { TipoCliente } from "@/lib/generated/prisma/enums";

export const clienteSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellidos: z.string().min(1, "Los apellidos son obligatorios"),
  telefono: z.string().optional().or(z.literal("")),
  email: z
    .string()
    .email("Email no válido")
    .optional()
    .or(z.literal("")),
  direccion: z.string().optional().or(z.literal("")),
  tipoCliente: z.nativeEnum(TipoCliente),
  notas: z.string().optional().or(z.literal("")),
  fechaProximoContacto: z.string().optional().or(z.literal("")),
});

export type ClienteInput = z.infer<typeof clienteSchema>;

export const TIPO_CLIENTE_LABELS: Record<TipoCliente, string> = {
  COMPRADOR: "Comprador",
  VENDEDOR: "Vendedor",
  INQUILINO: "Inquilino",
  PROPIETARIO: "Propietario",
};
