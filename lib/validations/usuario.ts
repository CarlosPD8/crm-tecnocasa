import { z } from "zod";
import { RolUsuario } from "@/lib/generated/prisma/enums";
import { PASSWORD_MINIMO } from "@/lib/validations/cuenta";

export const ROL_LABELS: Record<RolUsuario, string> = {
  DIRECTOR: "Director",
  ASESOR: "Asesor",
};

export const ROL_DESCRIPCION: Record<RolUsuario, string> = {
  DIRECTOR: "Gestiona el equipo, borra registros, reasigna y exporta.",
  ASESOR: "Trabaja con todos los datos de la oficina.",
};

const nombre = z.string().trim().min(2, "Escribe el nombre.").max(80, "Demasiado largo.");

export const passwordTemporalSchema = z
  .string()
  .trim()
  .min(PASSWORD_MINIMO, `Usa al menos ${PASSWORD_MINIMO} caracteres.`)
  .max(72, "Usa como máximo 72 caracteres.");

export const nuevoUsuarioSchema = z.object({
  nombre,
  email: z.string().trim().toLowerCase().min(1, "Escribe el email.").email("Email no válido."),
  rol: z.nativeEnum(RolUsuario),
  password: passwordTemporalSchema,
});

export const editarUsuarioSchema = z.object({
  nombre,
  rol: z.nativeEnum(RolUsuario),
});

export type NuevoUsuarioInput = z.infer<typeof nuevoUsuarioSchema>;
export type EditarUsuarioInput = z.infer<typeof editarUsuarioSchema>;
