"use server";

import { revalidatePath } from "next/cache";

import { getContexto, SIN_PERMISO, type Contexto } from "@/lib/db";
import { frase, registrarActividad } from "@/lib/actividad";
import { comprobarLugar, ipDeLaPeticion } from "@/lib/ubicacion/servidor";
import { resolverLugar } from "@/lib/ubicacion/lugar";
import { distanciaMetros } from "@/lib/ubicacion/geo";
import { esIpPublica, ipEnRedes, redDeIp } from "@/lib/ubicacion/red";
import {
  ajustesOficinaSchema,
  MAX_REDES,
  PRECISION_MAXIMA,
  ubicacionEnviadaSchema,
  type AjustesOficinaInput,
  type EstadoLugar,
  type UbicacionEnviada,
} from "@/lib/validations/ubicacion";

// Location control (point 4). The settings are the director's; the scope
// extension only lets them change these fields of their own office.

async function contextoDirector(): Promise<Contexto | null> {
  const ctx = await getContexto();
  return ctx.esDirector ? ctx : null;
}

function posicionDe(ub: unknown) {
  const r = ubicacionEnviadaSchema.safeParse(ub);
  return r.success ? r.data.pos : null;
}

/** Location settings and office are shown in the layout and every form. */
function revalidarTodo() {
  revalidatePath("/", "layout");
}

/**
 * Whether the user could save right now, for a form to warn before they type.
 * Reads only: nothing about the position is kept.
 */
export async function consultarLugar(ub: UbicacionEnviada): Promise<EstadoLugar> {
  const ctx = await getContexto();
  if (!ctx.controlUbicacion) return { control: false };
  const r = await comprobarLugar(ctx, ub);
  return r.ok
    ? { control: true, ok: true, lugar: r.lugar, via: r.via }
    : { control: true, ok: false, motivo: r.motivo, mensaje: r.mensaje };
}

/**
 * Director: where the app places them now, against every zone of the office.
 * To walk the streets and check the contours. Nothing is stored.
 */
export async function probarUbicacion(ub: UbicacionEnviada) {
  const ctx = await contextoDirector();
  if (!ctx) return SIN_PERMISO;
  const pos = posicionDe(ub);
  const [zonas, ip] = await Promise.all([
    ctx.db.zona.findMany({ select: { nombre: true, forma: true }, orderBy: { nombre: "asc" } }),
    ipDeLaPeticion(),
  ]);
  const lugar = resolverLugar({ ip, pos, oficina: ctx.ubicacionOficina, zonas });
  return { success: true as const, lugar, precision: pos ? Math.round(pos.precision) : null };
}

export async function cambiarControlUbicacion(activo: boolean, avisados: boolean) {
  const ctx = await contextoDirector();
  if (!ctx) return SIN_PERMISO;

  const oficina = await ctx.db.oficina.findUnique({
    where: { id: ctx.oficinaId },
    select: { controlUbicacion: true, latitud: true },
  });
  if (!oficina) return SIN_PERMISO;
  if (oficina.controlUbicacion === activo) return { success: true as const };
  if (activo && oficina.latitud === null) {
    return { success: false as const, error: "Marca antes la oficina en el mapa." };
  }
  if (activo && !avisados) {
    return { success: false as const, error: "Confirma que has avisado por escrito a los asesores." };
  }

  await ctx.db.$transaction(async (tx) => {
    await tx.oficina.update({
      where: { id: ctx.oficinaId },
      data: { controlUbicacion: activo, controlUbicacionDesde: activo ? new Date() : null },
    });
    await registrarActividad(tx, {
      accion: "CAMBIO",
      entidad: "OFICINA",
      entidadId: ctx.oficinaId,
      enlace: "/zonas",
      resumen: frase.controlUbicacion(activo),
    });
  });
  revalidarTodo();
  return { success: true as const };
}

/** The office point and radius. Never logged with coordinates. */
export async function guardarOficina(data: AjustesOficinaInput) {
  const ctx = await contextoDirector();
  if (!ctx) return SIN_PERMISO;

  const parsed = ajustesOficinaSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Revisa la ubicación." };
  }
  const antes = ctx.ubicacionOficina;
  const { latitud, longitud, radioMetros } = parsed.data;
  if (antes.latitud === latitud && antes.longitud === longitud && antes.radioMetros === radioMetros) {
    return { success: true as const };
  }

  await ctx.db.$transaction(async (tx) => {
    await tx.oficina.update({ where: { id: ctx.oficinaId }, data: { latitud, longitud, radioMetros } });
    await registrarActividad(tx, {
      accion: "CAMBIO",
      entidad: "OFICINA",
      entidadId: ctx.oficinaId,
      enlace: "/zonas",
      resumen: frase.oficinaEnMapa(radioMetros, antes.latitud !== null),
    });
  });
  revalidarTodo();
  return { success: true as const };
}

/**
 * Saves the network this request comes from as the office's. With a good GPS
 * fix far from the office it refuses: it would be some other network (home,
 * a café…). Without GPS (a wired desktop) it trusts the director.
 */
export async function marcarRedOficina(ub: UbicacionEnviada) {
  const ctx = await contextoDirector();
  if (!ctx) return SIN_PERMISO;

  const ip = await ipDeLaPeticion();
  if (!ip) return { success: false as const, error: "No se ha podido leer la dirección de esta conexión." };
  if (!esIpPublica(ip)) {
    return {
      success: false as const,
      error: "Esta conexión no tiene una dirección propia en internet, así que no sirve para reconocer la oficina.",
    };
  }
  const red = redDeIp(ip)!;
  const { redes, latitud, longitud, radioMetros } = ctx.ubicacionOficina;
  if (ipEnRedes(ip, redes)) return { success: true as const, red };
  if (redes.length >= MAX_REDES) {
    return { success: false as const, error: `Ya hay ${MAX_REDES} redes guardadas: quita alguna antes.` };
  }
  const pos = posicionDe(ub);
  if (pos && pos.precision <= PRECISION_MAXIMA && latitud !== null && longitud !== null) {
    const metros = distanciaMetros(pos, { lat: latitud, lng: longitud });
    if (metros > radioMetros + 300) {
      return {
        success: false as const,
        error: `Tu ubicación está a ${Math.round(metros / 100) / 10} km de la oficina. Marca la red desde la conexión de la oficina.`,
      };
    }
  }

  await ctx.db.$transaction(async (tx) => {
    await tx.oficina.update({ where: { id: ctx.oficinaId }, data: { redes: [...redes, red] } });
    await registrarActividad(tx, {
      accion: "CAMBIO",
      entidad: "OFICINA",
      entidadId: ctx.oficinaId,
      enlace: "/zonas",
      resumen: frase.redOficina(red),
    });
  });
  revalidarTodo();
  return { success: true as const, red };
}

export async function quitarRedOficina(red: string) {
  const ctx = await contextoDirector();
  if (!ctx) return SIN_PERMISO;

  const { redes } = ctx.ubicacionOficina;
  if (!redes.includes(red)) return { success: true as const };

  await ctx.db.$transaction(async (tx) => {
    await tx.oficina.update({ where: { id: ctx.oficinaId }, data: { redes: redes.filter((r) => r !== red) } });
    await registrarActividad(tx, {
      accion: "CAMBIO",
      entidad: "OFICINA",
      entidadId: ctx.oficinaId,
      enlace: "/zonas",
      resumen: frase.redOficina(red, true),
    });
  });
  revalidarTodo();
  return { success: true as const };
}
