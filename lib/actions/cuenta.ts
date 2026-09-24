"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import { crearDbOficina, getContexto, getSesionPerfil } from "@/lib/db";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import {
  cambiarPasswordSchema,
  passwordInicialSchema,
  type CambiarPasswordInput,
  type PasswordInicialInput,
} from "@/lib/validations/cuenta";

type Errores = Record<string, string[] | undefined>;

async function ponerPassword(usuarioId: string, password: string): Promise<Errores | null> {
  const { error } = await crearClienteAdmin().auth.admin.updateUserById(usuarioId, { password });
  if (!error) return null;
  // Supabase rejects passwords that are weak or found in known leaks.
  if (error.code === "weak_password") {
    return { password: ["Esa contraseña es demasiado débil o conocida. Elige otra."] };
  }
  return { _: ["No se pudo guardar la contraseña. Inténtalo de nuevo."] };
}

/**
 * First sign-in with the temporary password set by the director. Runs before
 * getContexto() lets the user in, so it does its own checks.
 */
export async function cambiarPasswordInicial(data: PasswordInicialInput) {
  const sesion = await getSesionPerfil();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;
  if (!usuario || !usuario.activo || !usuario.oficina.activa) redirect("/sin-acceso");
  if (!usuario.debeCambiarPassword) redirect("/");

  const parsed = passwordInicialSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors as Errores };
  }

  const error = await ponerPassword(usuario.id, parsed.data.password);
  if (error) return { success: false as const, error };

  await crearDbOficina(usuario.oficinaId, usuario.id).usuario.updateMany({
    where: { id: usuario.id },
    data: { debeCambiarPassword: false },
  });
  redirect("/");
}

/** Change from «Mi cuenta», confirming the current password first. */
export async function cambiarPassword(data: CambiarPasswordInput) {
  const { usuario } = await getContexto();

  const parsed = cambiarPasswordSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors as Errores };
  }

  // Throwaway client: checking the password must not touch the browser session.
  const comprobador = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  );
  const { error: errorActual } = await comprobador.auth.signInWithPassword({
    email: usuario.email,
    password: parsed.data.actual,
  });
  if (errorActual) {
    return { success: false as const, error: { actual: ["La contraseña actual no es correcta."] } as Errores };
  }
  // Revoke only the session that check just opened.
  await comprobador.auth.signOut({ scope: "local" });

  const error = await ponerPassword(usuario.id, parsed.data.password);
  if (error) return { success: false as const, error };
  return { success: true as const };
}
