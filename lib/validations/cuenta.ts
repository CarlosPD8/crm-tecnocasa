import { z } from "zod";

export const PASSWORD_MINIMO = 10;

const nuevaPassword = z
  .string()
  .min(PASSWORD_MINIMO, `Usa al menos ${PASSWORD_MINIMO} caracteres.`)
  // bcrypt, used by Supabase Auth, ignores anything past 72 bytes.
  .max(72, "Usa como máximo 72 caracteres.");

export const passwordInicialSchema = z
  .object({ password: nuevaPassword, confirmacion: z.string() })
  .refine((d) => d.password === d.confirmacion, {
    path: ["confirmacion"],
    message: "Las contraseñas no coinciden.",
  });

export const cambiarPasswordSchema = z
  .object({
    actual: z.string().min(1, "Escribe tu contraseña actual."),
    password: nuevaPassword,
    confirmacion: z.string(),
  })
  .refine((d) => d.password === d.confirmacion, {
    path: ["confirmacion"],
    message: "Las contraseñas no coinciden.",
  })
  .refine((d) => d.password !== d.actual, {
    path: ["password"],
    message: "La nueva contraseña debe ser distinta de la actual.",
  });

export type PasswordInicialInput = z.infer<typeof passwordInicialSchema>;
export type CambiarPasswordInput = z.infer<typeof cambiarPasswordSchema>;
