import "server-only";
import { headers } from "next/headers";

import type { Contexto } from "@/lib/db";
import { ipDeCabeceras } from "@/lib/ubicacion/red";
import { resolverLugar, type Lugar } from "@/lib/ubicacion/lugar";
import { ubicacionEnviadaSchema } from "@/lib/validations/ubicacion";

/**
 * The location check on the server. The position comes from the browser as an
 * action argument and is used only here: never stored or logged.
 */

/** The client's public IP (set by Vercel; null in local development). */
export async function ipDeLaPeticion() {
  const h = await headers();
  return ipDeCabeceras((nombre) => h.get(nombre));
}

/** Where the user is, from the position they sent, their IP and their zones. */
export async function comprobarLugar(ctx: Contexto, ub: unknown): Promise<Lugar> {
  const enviada = ubicacionEnviadaSchema.safeParse(ub);
  const zonas = ctx.zonas?.length
    ? await ctx.db.zona.findMany({ where: { id: { in: ctx.zonas } }, select: { nombre: true, forma: true } })
    : [];
  return resolverLugar({
    ip: await ipDeLaPeticion(),
    pos: enviada.success ? enviada.data.pos : null,
    oficina: ctx.ubicacionOficina,
    zonas,
  });
}
