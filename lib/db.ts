import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { extensionOficina } from "@/lib/ambito-oficina";
import type { RolUsuario } from "@/lib/generated/prisma/enums";

/**
 * Data access for the signed-in user's office. Pages, actions and route
 * handlers get their Prisma client from here (`ctx.db`), never from
 * `@/lib/prisma` directly (enforced by ESLint).
 */

export function crearDbOficina(oficinaId: string, usuarioId: string) {
  return prisma.$extends(extensionOficina(oficinaId, usuarioId));
}

export type DbOficina = ReturnType<typeof crearDbOficina>;

export type Contexto = {
  usuario: { id: string; nombre: string; email: string; rol: RolUsuario };
  oficina: { id: string; nombre: string };
  oficinaId: string;
  esDirector: boolean;
  db: DbOficina;
};

/**
 * Session claims plus the user's profile, without the access checks. For the
 * pages that must work before those checks pass (password change, no access).
 */
export const getSesionPerfil = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    include: { oficina: { select: { id: true, nombre: true, activa: true } } },
  });
  return { id, email: data.claims.email as string | undefined, usuario };
});

type Resolucion =
  | { estado: "ok"; ctx: Contexto }
  | { estado: "sin-sesion" | "sin-acceso" | "cambiar-contrasena" };

const resolverContexto = cache(async (): Promise<Resolucion> => {
  const sesion = await getSesionPerfil();
  if (!sesion) return { estado: "sin-sesion" };
  const { usuario } = sesion;
  // Checked on every request: deactivating a user or office locks them out at
  // once, even with a still-valid JWT.
  if (!usuario || !usuario.activo || !usuario.oficina.activa) return { estado: "sin-acceso" };
  if (usuario.debeCambiarPassword) return { estado: "cambiar-contrasena" };

  return {
    estado: "ok",
    ctx: {
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
      oficina: { id: usuario.oficina.id, nombre: usuario.oficina.nombre },
      oficinaId: usuario.oficinaId,
      esDirector: usuario.rol === "DIRECTOR",
      db: crearDbOficina(usuario.oficinaId, usuario.id),
    },
  };
});

const DESTINO = {
  "sin-sesion": "/login",
  "sin-acceso": "/sin-acceso",
  "cambiar-contrasena": "/cambiar-contrasena",
} as const;

/** For pages and server actions: redirects when the user can't be here. */
export async function getContexto(): Promise<Contexto> {
  const r = await resolverContexto();
  if (r.estado !== "ok") redirect(DESTINO[r.estado]);
  return r.ctx;
}

/** For director-only pages: anyone else gets a 404, as if it didn't exist. */
export async function requireDirector(): Promise<Contexto> {
  const ctx = await getContexto();
  if (!ctx.esDirector) notFound();
  return ctx;
}

/** For route handlers: null instead of a redirect, so they can answer 401. */
export async function getContextoApi(): Promise<Contexto | null> {
  const r = await resolverContexto();
  return r.estado === "ok" ? r.ctx : null;
}

export const SIN_PERMISO = {
  success: false as const,
  error: "No tienes permiso para hacer esto.",
};

type ModeloOficina =
  | "cliente"
  | "inmueble"
  | "bloque"
  | "evento"
  | "contacto"
  | "archivo"
  | "operacion"
  | "interes";

/**
 * Whether a row with this id exists in the user's office. Every id that comes
 * from the browser goes through here before it's linked or revalidated.
 */
export async function existe(db: DbOficina, modelo: ModeloOficina, id: string | null | undefined) {
  if (!id) return false;
  const delegado = db[modelo] as unknown as { count(args: { where: { id: string } }): Promise<number> };
  return (await delegado.count({ where: { id } })) > 0;
}

/** Whether the id is an active user of the office (to assign as advisor). */
export async function esAsesorValido(db: DbOficina, id: string | null | undefined) {
  if (!id) return false;
  return (await db.usuario.count({ where: { id, activo: true } })) > 0;
}

export type OpcionAsesor = { id: string; nombre: string; activo: boolean };

/** Office users for advisor pickers and filters (inactive ones flagged). */
export function opcionesAsesor(db: DbOficina): Promise<OpcionAsesor[]> {
  return db.usuario.findMany({
    select: { id: true, nombre: true, activo: true },
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });
}

/**
 * Advisor to store on a client or property. Only directors choose it (and only
 * among active users of the office); an advisor creating a record becomes its
 * advisor and can't change it afterwards.
 *
 * `actual`: the record's current advisor when editing, `undefined` when creating.
 * Returns `undefined` for "leave as is", or an error message.
 */
export async function resolverAsesor(
  ctx: Contexto,
  pedido: string | undefined,
  actual?: string | null
): Promise<{ ok: true; asesorId: string | null | undefined } | { ok: false; error: string }> {
  const creando = actual === undefined;
  if (!ctx.esDirector || pedido === undefined) {
    return { ok: true, asesorId: creando ? ctx.usuario.id : undefined };
  }
  if (pedido === "") return { ok: true, asesorId: null };
  // Keeping a now-deactivated advisor while editing other fields is fine.
  if (pedido === actual || (await esAsesorValido(ctx.db, pedido))) return { ok: true, asesorId: pedido };
  return { ok: false, error: "Elige un asesor activo de la oficina." };
}
