"use server";

import { revalidatePath } from "next/cache";

import { getContexto, SIN_PERMISO, type Contexto, type DbOficina } from "@/lib/db";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import {
  editarUsuarioSchema,
  nuevoUsuarioSchema,
  passwordTemporalSchema,
  type EditarUsuarioInput,
  type NuevoUsuarioInput,
} from "@/lib/validations/usuario";

// Team management, director only. Users are never deleted: deactivating keeps
// their authorship on everything they created.

// Supabase has no "ban forever": a century is close enough.
const BLOQUEO_AUTH = "876000h";

type Errores = Record<string, string[] | undefined>;

async function contextoDirector(): Promise<Contexto | null> {
  const ctx = await getContexto();
  return ctx.esDirector ? ctx : null;
}

class SinDirector extends Error {}

/** Throws inside a transaction when the office would be left without an active director. */
async function exigirDirectorActivo(tx: Pick<DbOficina, "usuario">) {
  const directores = await tx.usuario.count({ where: { rol: "DIRECTOR", activo: true } });
  if (directores === 0) throw new SinDirector();
}

const SIN_DIRECTOR = {
  success: false as const,
  error: "La oficina tiene que conservar al menos un director activo.",
};

export async function crearUsuario(data: NuevoUsuarioInput) {
  const ctx = await contextoDirector();
  if (!ctx) return { success: false as const, error: { _: [SIN_PERMISO.error] } as Errores };

  const parsed = nuevoUsuarioSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors as Errores };
  }
  const { nombre, email, rol, password } = parsed.data;

  const admin = crearClienteAdmin();
  const { data: creado, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (error || !creado.user) {
    // Auth accounts are global: the email may belong to someone in another office.
    if (error?.code === "email_exists") {
      return { success: false as const, error: { email: ["Ese email ya tiene una cuenta en el CRM."] } as Errores };
    }
    if (error?.code === "weak_password") {
      return { success: false as const, error: { password: ["Esa contraseña es demasiado débil o conocida."] } as Errores };
    }
    return { success: false as const, error: { _: ["No se pudo crear la cuenta. Inténtalo de nuevo."] } as Errores };
  }

  try {
    await ctx.db.usuario.create({
      data: { id: creado.user.id, nombre, email, rol, debeCambiarPassword: true },
    });
  } catch {
    // Don't leave an Auth account without a profile (it could never sign in).
    await admin.auth.admin.deleteUser(creado.user.id);
    return { success: false as const, error: { _: ["No se pudo crear la cuenta. Inténtalo de nuevo."] } as Errores };
  }

  revalidatePath("/equipo");
  return { success: true as const, email, password };
}

export async function editarUsuario(id: string, data: EditarUsuarioInput) {
  const ctx = await contextoDirector();
  if (!ctx) return { success: false as const, error: { _: [SIN_PERMISO.error] } as Errores };

  const parsed = editarUsuarioSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors as Errores };
  }

  try {
    const count = await ctx.db.$transaction(async (tx) => {
      const { count } = await tx.usuario.updateMany({ where: { id }, data: parsed.data });
      await exigirDirectorActivo(tx);
      return count;
    });
    if (!count) return { success: false as const, error: { _: ["Esa persona ya no está en la oficina."] } as Errores };
  } catch (e) {
    if (e instanceof SinDirector) return { success: false as const, error: { rol: [SIN_DIRECTOR.error] } as Errores };
    throw e;
  }

  revalidatePath("/equipo");
  return { success: true as const };
}

/** Deactivating locks the user out on their next request and bans them in Auth. */
export async function cambiarActivo(id: string, activo: boolean) {
  const ctx = await contextoDirector();
  if (!ctx) return SIN_PERMISO;
  if (id === ctx.usuario.id) {
    return { success: false as const, error: "No puedes desactivar tu propia cuenta." };
  }

  try {
    const count = await ctx.db.$transaction(async (tx) => {
      const { count } = await tx.usuario.updateMany({ where: { id }, data: { activo } });
      await exigirDirectorActivo(tx);
      return count;
    });
    if (!count) return { success: false as const, error: "Esa persona ya no está en la oficina." };
  } catch (e) {
    if (e instanceof SinDirector) return SIN_DIRECTOR;
    throw e;
  }

  // The database flag already locks them out of the CRM; the ban also stops new sign-ins.
  const { error } = await crearClienteAdmin().auth.admin.updateUserById(id, {
    ban_duration: activo ? "none" : BLOQUEO_AUTH,
  });

  revalidatePath("/equipo");
  if (error) {
    return {
      success: true as const,
      aviso: activo
        ? "Reactivada, pero no se pudo desbloquear el acceso. Vuelve a intentarlo."
        : "Desactivada en el CRM, pero no se pudo bloquear el inicio de sesión.",
    };
  }
  return { success: true as const };
}

/** New temporary password; the user must change it on their next sign-in. */
export async function restablecerPassword(id: string, password: string) {
  const ctx = await contextoDirector();
  if (!ctx) return { success: false as const, error: SIN_PERMISO.error };
  if (id === ctx.usuario.id) {
    return { success: false as const, error: "Para tu propia contraseña usa «Mi cuenta»." };
  }

  const parsed = passwordTemporalSchema.safeParse(password);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message };

  const usuario = await ctx.db.usuario.findUnique({ where: { id }, select: { email: true } });
  if (!usuario) return { success: false as const, error: "Esa persona ya no está en la oficina." };

  const { error } = await crearClienteAdmin().auth.admin.updateUserById(id, { password: parsed.data });
  if (error) {
    return {
      success: false as const,
      error:
        error.code === "weak_password"
          ? "Esa contraseña es demasiado débil o conocida."
          : "No se pudo cambiar la contraseña. Inténtalo de nuevo.",
    };
  }
  await ctx.db.usuario.updateMany({ where: { id }, data: { debeCambiarPassword: true } });

  revalidatePath("/equipo");
  return { success: true as const, email: usuario.email, password: parsed.data };
}
