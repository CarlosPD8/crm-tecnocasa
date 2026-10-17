"use server";

import { revalidatePath } from "next/cache";
import {
  esUnicoViolado,
  existeEnOficina,
  getContexto,
  getContextoEscritura,
  resolverAsesor,
  resolverZona,
  SIN_PERMISO,
  type Contexto,
  type DbOficina,
} from "@/lib/db";
import type { UbicacionEnviada } from "@/lib/validations/ubicacion";
import { cambioInmueble, frase, incluirCambiosInmueble, registrarActividad } from "@/lib/actividad";
import { inmuebleSchema, type InmuebleInput } from "@/lib/validations/inmueble";

function toNullable(value: string | undefined) {
  return value && value.trim() !== "" ? value : null;
}

function toIntOrNull(value: string | undefined) {
  if (!value || value.trim() === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : Math.trunc(n);
}

function buildData(data: InmuebleInput) {
  return {
    referencia: data.referencia,
    direccion: data.direccion,
    localidad: data.localidad,
    tipoInmueble: data.tipoInmueble,
    tipoOperacion: data.tipoOperacion,
    precio: data.precio,
    metrosCuadrados: toIntOrNull(data.metrosCuadrados),
    habitaciones: toIntOrNull(data.habitaciones),
    banos: toIntOrNull(data.banos),
    descripcion: toNullable(data.descripcion),
    estado: data.estado,
    propietarioId: toNullable(data.propietarioId),
    bloqueId: toNullable(data.bloqueId),
    escalera: toNullable(data.escalera?.trim()),
    planta: toIntOrNull(data.planta),
    puerta: toNullable(data.puerta?.trim()),
    ocupacion: data.ocupacion === "SIN_DATOS" ? null : data.ocupacion,
    captacion: data.captacion === "SIN_MARCA" ? null : data.captacion,
    // Date only: stored as UTC midnight of that day.
    fechaFinAlquiler: data.fechaFinAlquiler ? new Date(`${data.fechaFinAlquiler}T00:00:00.000Z`) : null,
    fechaProximoContacto: data.fechaProximoContacto
      ? new Date(`${data.fechaProximoContacto}T00:00:00.000Z`)
      : null,
  };
}

type DatosInmueble = ReturnType<typeof buildData>;
type Anterior = { id: string; bloqueId: string | null; propietarioId: string | null; zonaId: string };
type Errores = Record<string, string[]>;

const REFERENCIA_REPETIDA = { referencia: ["Ya existe un inmueble con esta referencia."] };

/**
 * Checks the reference and the links, and works out the zone. Only links that
 * change are checked, so an advisor keeps a block they don't see (one of
 * another zone) as it is. The owner may be any client of the office: an
 * advisor links an existing one by exact DNI or phone (buscarClientes).
 *
 * Returns the zone to write (undefined: leave as is, or the block's), or errors.
 */
async function comprobarDatos(
  ctx: Contexto,
  datos: DatosInmueble,
  zonaPedida: string | undefined,
  anterior?: Anterior
): Promise<{ errores: Errores } | { errores: null; zonaId: string | undefined }> {
  const { db } = ctx;
  const duplicado = await db.inmueble.findFirst({
    where: { referencia: datos.referencia, ...(anterior ? { NOT: { id: anterior.id } } : {}) },
    select: { id: true },
  });
  if (duplicado) return { errores: REFERENCIA_REPETIDA };

  if (
    datos.propietarioId &&
    datos.propietarioId !== anterior?.propietarioId &&
    !(await existeEnOficina(ctx, "cliente", datos.propietarioId))
  ) {
    return { errores: { propietarioId: ["El propietario ya no existe."] } };
  }

  if (anterior && datos.bloqueId === anterior.bloqueId) {
    // Same block, or still loose: a loose one may change zone (director only).
    if (datos.bloqueId) return { errores: null, zonaId: undefined };
    const zona = await resolverZona(ctx, zonaPedida, anterior.zonaId);
    return zona.ok ? { errores: null, zonaId: zona.zonaId } : { errores: { zonaId: [zona.error] } };
  }

  if (datos.bloqueId) {
    const bloque = await db.bloque.findUnique({ where: { id: datos.bloqueId }, select: { zonaId: true } });
    if (!bloque) return { errores: { bloqueId: ["El bloque ya no existe."] } };
    // Entering a block means taking its zone: an advisor can't move a flat to another zone.
    if (anterior && !ctx.esDirector && bloque.zonaId !== anterior.zonaId) {
      return { errores: { bloqueId: ["Ese bloque está en otra zona. Pide al director que mueva el piso."] } };
    }
    return { errores: null, zonaId: anterior ? undefined : bloque.zonaId };
  }

  // Leaving a block keeps its zone (the director may pick another one).
  const zona = await resolverZona(ctx, zonaPedida, anterior?.zonaId);
  return zona.ok ? { errores: null, zonaId: zona.zonaId } : { errores: { zonaId: [zona.error] } };
}

/** Assigning a property as owner tags the client as «Propietario». */
async function marcarPropietario(db: DbOficina, clienteId: string | null) {
  if (!clienteId) return;
  const { count } = await db.cliente.updateMany({
    where: { id: clienteId, NOT: { tipos: { has: "PROPIETARIO" } } },
    data: { tipos: { push: "PROPIETARIO" } },
  });
  revalidatePath(`/clientes/${clienteId}`);
  if (count) revalidatePath("/clientes");
}

function revalidarBloque(bloqueId: string | null) {
  if (bloqueId) revalidatePath(`/bloques/${bloqueId}`);
  revalidatePath("/bloques");
}

export async function crearInmueble(data: InmuebleInput, ub: UbicacionEnviada) {
  const ctx = await getContextoEscritura(ub);
  if (!ctx.ok) return ctx.fallo;
  const { db } = ctx;
  const parsed = inmuebleSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const datos = buildData(parsed.data);
  const comprobado = await comprobarDatos(ctx, datos, parsed.data.zonaId);
  if (comprobado.errores) return { success: false as const, error: comprobado.errores };
  const asesor = await resolverAsesor(ctx, parsed.data.asesorId);
  if (!asesor.ok) return { success: false as const, error: { asesorId: [asesor.error] } as Errores };

  let inmueble;
  try {
    inmueble = await db.$transaction(async (tx) => {
      const creado = await tx.inmueble.create({
        data: { ...datos, zonaId: comprobado.zonaId!, asesorId: asesor.asesorId },
      });
      await registrarActividad(tx, {
        accion: "ALTA",
        entidad: "INMUEBLE",
        entidadId: creado.id,
        enlace: `/inmuebles/${creado.id}`,
        resumen: frase.altaInmueble(creado.referencia, creado.direccion),
      });
      return creado;
    });
  } catch (e) {
    // The reference exists in a zone this advisor doesn't see.
    if (esUnicoViolado(e)) return { success: false as const, error: REFERENCIA_REPETIDA as Errores };
    throw e;
  }
  await marcarPropietario(db, inmueble.propietarioId);

  revalidatePath("/inmuebles");
  revalidarBloque(inmueble.bloqueId);
  return { success: true as const, inmuebleId: inmueble.id };
}

export async function actualizarInmueble(id: string, data: InmuebleInput, ub: UbicacionEnviada) {
  const ctx = await getContextoEscritura(ub);
  if (!ctx.ok) return ctx.fallo;
  const { db } = ctx;
  const parsed = inmuebleSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const anterior = await db.inmueble.findUnique({ where: { id }, include: incluirCambiosInmueble });
  if (!anterior) return { success: false as const, error: { _: ["Este inmueble ya no existe."] } as Errores };

  const datos = buildData(parsed.data);
  // An advisor can't see (or change) a block of another zone: it stays.
  if (anterior.bloqueId && !anterior.bloque) datos.bloqueId = anterior.bloqueId;
  const comprobado = await comprobarDatos(ctx, datos, parsed.data.zonaId, anterior);
  if (comprobado.errores) return { success: false as const, error: comprobado.errores };
  const asesor = await resolverAsesor(ctx, parsed.data.asesorId, anterior.asesorId);
  if (!asesor.ok) return { success: false as const, error: { asesorId: [asesor.error] } as Errores };

  let actualizado;
  try {
    actualizado = await db.$transaction(async (tx) => {
      const nuevo = await tx.inmueble.update({
        where: { id },
        data: {
          ...datos,
          asesorId: asesor.asesorId,
          ...(comprobado.zonaId ? { zonaId: comprobado.zonaId } : {}),
        },
        include: incluirCambiosInmueble,
      });
      const cambio = cambioInmueble(anterior, nuevo);
      if (cambio) await registrarActividad(tx, cambio);
      return nuevo;
    });
  } catch (e) {
    if (esUnicoViolado(e)) return { success: false as const, error: REFERENCIA_REPETIDA as Errores };
    throw e;
  }
  await marcarPropietario(db, actualizado.propietarioId);

  revalidatePath("/inmuebles");
  revalidatePath(`/inmuebles/${id}`);
  // Moving a flat between blocks changes both block pages.
  revalidarBloque(anterior.bloqueId);
  if (actualizado.bloqueId !== anterior.bloqueId) revalidarBloque(actualizado.bloqueId);
  return { success: true as const, inmuebleId: id };
}

export async function eliminarInmueble(id: string, ub: UbicacionEnviada) {
  const ctx = await getContextoEscritura(ub);
  if (!ctx.ok) return ctx.fallo;
  const { db, esDirector } = ctx;
  if (!esDirector) return SIN_PERMISO;

  const inmueble = await db.inmueble.findUnique({
    where: { id },
    select: { referencia: true, direccion: true, bloqueId: true, _count: { select: { operaciones: true } } },
  });
  if (!inmueble) return { success: false as const, error: "Este inmueble ya no existe." };

  if (inmueble._count.operaciones) {
    return {
      success: false as const,
      error: "No se puede eliminar: tiene operaciones asociadas.",
    };
  }

  await db.$transaction(async (tx) => {
    const { count } = await tx.inmueble.deleteMany({ where: { id } });
    if (count) {
      await registrarActividad(tx, {
        accion: "BAJA",
        entidad: "INMUEBLE",
        entidadId: id,
        resumen: `Borró ${inmueble.referencia} · ${inmueble.direccion}`,
      });
    }
  });
  revalidatePath("/inmuebles");
  revalidarBloque(inmueble.bloqueId);
  return { success: true as const };
}

export async function buscarInmuebles(query: string) {
  const { db } = await getContexto();

  const q = query.trim();
  if (!q) return [];

  return db.inmueble.findMany({
    where: {
      OR: [
        { referencia: { contains: q, mode: "insensitive" } },
        { direccion: { contains: q, mode: "insensitive" } },
        { localidad: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, referencia: true, direccion: true, localidad: true },
    orderBy: { referencia: "asc" },
    take: 10,
  });
}
