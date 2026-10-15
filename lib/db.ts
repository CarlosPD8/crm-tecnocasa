import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { extensionOficina } from "@/lib/ambito-oficina";
import { registrarActividad } from "@/lib/actividad";
import { Prisma } from "@/lib/generated/prisma/client";
import type { RolUsuario } from "@/lib/generated/prisma/enums";

/**
 * Data access for the signed-in user's office. Pages, actions and route
 * handlers get their Prisma client from here (`ctx.db`), never from
 * `@/lib/prisma` directly (enforced by ESLint).
 */

/** `zonas`: an advisor's zone ids; null (director) sees the whole office. */
export function crearDbOficina(oficinaId: string, usuarioId: string, zonas: readonly string[] | null = null) {
  return prisma.$extends(extensionOficina(oficinaId, usuarioId, zonas));
}

export type DbOficina = ReturnType<typeof crearDbOficina>;

export type Contexto = {
  usuario: { id: string; nombre: string; email: string; rol: RolUsuario };
  oficina: { id: string; nombre: string };
  oficinaId: string;
  esDirector: boolean;
  /** The advisor's zone ids; null for a director, who sees every zone. */
  zonas: string[] | null;
  /** Scoped to the office and, for an advisor, to their zones. */
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
    include: {
      oficina: { select: { id: true, nombre: true, activa: true } },
      zonasAsignadas: { select: { zonaId: true } },
    },
  });
  return { id, email: data.claims.email as string | undefined, usuario };
});

const MINUTO = 60 * 1000;
/** Last access is written at most this often… */
const ANOTAR_CADA = 5 * MINUTO;
/** …and coming back after this long away counts as a new visit («Entradas»). */
const NUEVA_ENTRADA = 30 * MINUTO;

/**
 * Keeps `ultimoAcceso` current and logs a visit after a pause. Runs after the
 * response, so it never slows a page down. The update is conditional on the
 * value just read: of several parallel requests, only one logs the visit.
 */
function anotarAcceso(usuario: { id: string; oficinaId: string; ultimoAcceso: Date | null }) {
  const ahora = new Date();
  const anterior = usuario.ultimoAcceso;
  const pausa = anterior ? ahora.getTime() - anterior.getTime() : Infinity;
  if (pausa < ANOTAR_CADA) return;

  after(async () => {
    try {
      const db = crearDbOficina(usuario.oficinaId, usuario.id);
      const { count } = await db.usuario.updateMany({
        where: { id: usuario.id, ultimoAcceso: anterior },
        data: { ultimoAcceso: ahora },
      });
      if (count && pausa >= NUEVA_ENTRADA) {
        await registrarActividad(db, { accion: "ENTRADA", resumen: "Entró en la app" }, ahora);
      }
    } catch (error) {
      console.error("No se pudo anotar el acceso", error);
    }
  });
}

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
  anotarAcceso(usuario);

  const esDirector = usuario.rol === "DIRECTOR";
  const zonas = esDirector ? null : usuario.zonasAsignadas.map((z) => z.zonaId);
  return {
    estado: "ok",
    ctx: {
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
      oficina: { id: usuario.oficina.id, nombre: usuario.oficina.nombre },
      oficinaId: usuario.oficinaId,
      esDirector,
      zonas,
      db: crearDbOficina(usuario.oficinaId, usuario.id, zonas),
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

/**
 * The whole office, without the zone scope. Only for what an advisor may reach
 * outside their zones: finding an existing client by exact DNI or phone to link
 * them (see `buscarClientes`). Never for listing.
 */
export function dbSinZonas(ctx: Contexto): DbOficina {
  return ctx.zonas ? crearDbOficina(ctx.oficinaId, ctx.usuario.id) : ctx.db;
}

/** Like `existe`, but anywhere in the office (a client found by exact DNI or phone). */
export function existeEnOficina(ctx: Contexto, modelo: ModeloOficina, id: string | null | undefined) {
  return existe(dbSinZonas(ctx), modelo, id);
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

export type OpcionZona = { id: string; nombre: string; color: string };

/** Zones the user works with: all of the office for a director, their own for an advisor. */
export function zonasVisibles(ctx: Contexto): Promise<OpcionZona[]> {
  return ctx.db.zona.findMany({
    where: ctx.zonas ? { id: { in: ctx.zonas } } : undefined,
    select: { id: true, nombre: true, color: true },
    orderBy: { nombre: "asc" },
  });
}

/**
 * Zone to store on a block or a loose property. Required when creating (an
 * advisor picks one of theirs); when editing only the director changes it.
 *
 * `actual`: the record's current zone when editing, `undefined` when creating.
 * Returns `undefined` for "leave as is", or an error message.
 */
export async function resolverZona(
  ctx: Contexto,
  pedida: string | undefined,
  actual?: string | null
): Promise<{ ok: true; zonaId: string | undefined } | { ok: false; error: string }> {
  const creando = actual === undefined;
  if (!creando && (!ctx.esDirector || pedida === undefined || pedida === actual)) {
    return { ok: true, zonaId: undefined };
  }
  if (!pedida) return { ok: false, error: "Elige una zona." };
  if (ctx.zonas) {
    return ctx.zonas.includes(pedida) ? { ok: true, zonaId: pedida } : { ok: false, error: "Elige una de tus zonas." };
  }
  return (await ctx.db.zona.count({ where: { id: pedida } })) > 0
    ? { ok: true, zonaId: pedida }
    : { ok: false, error: "Elige una zona de la oficina." };
}

/** A unique constraint was violated (P2002): a duplicate name, DNI, reference… */
export function esUnicoViolado(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
