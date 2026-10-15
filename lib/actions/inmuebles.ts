"use server";

import { revalidatePath } from "next/cache";
import { existe, getContexto, resolverAsesor, SIN_PERMISO, type DbOficina } from "@/lib/db";
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

/** Field errors for a duplicate reference or links to rows outside the office. */
async function comprobarDatos(db: DbOficina, datos: DatosInmueble, excluirId?: string) {
  const duplicado = await db.inmueble.findFirst({
    where: { referencia: datos.referencia, ...(excluirId ? { NOT: { id: excluirId } } : {}) },
    select: { id: true },
  });
  if (duplicado) return { referencia: ["Ya existe un inmueble con esta referencia."] };
  if (datos.propietarioId && !(await existe(db, "cliente", datos.propietarioId))) {
    return { propietarioId: ["El propietario ya no existe."] };
  }
  if (datos.bloqueId && !(await existe(db, "bloque", datos.bloqueId))) {
    return { bloqueId: ["El bloque ya no existe."] };
  }
  return null;
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

export async function crearInmueble(data: InmuebleInput) {
  const ctx = await getContexto();
  const { db } = ctx;
  const parsed = inmuebleSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const datos = buildData(parsed.data);
  const error = await comprobarDatos(db, datos);
  if (error) return { success: false as const, error };
  const asesor = await resolverAsesor(ctx, parsed.data.asesorId);
  if (!asesor.ok) return { success: false as const, error: { asesorId: [asesor.error] } };

  const inmueble = await db.$transaction(async (tx) => {
    const creado = await tx.inmueble.create({ data: { ...datos, asesorId: asesor.asesorId } });
    await registrarActividad(tx, {
      accion: "ALTA",
      entidad: "INMUEBLE",
      entidadId: creado.id,
      enlace: `/inmuebles/${creado.id}`,
      resumen: frase.altaInmueble(creado.referencia, creado.direccion),
    });
    return creado;
  });
  await marcarPropietario(db, inmueble.propietarioId);

  revalidatePath("/inmuebles");
  revalidarBloque(inmueble.bloqueId);
  return { success: true as const, inmuebleId: inmueble.id };
}

export async function actualizarInmueble(id: string, data: InmuebleInput) {
  const ctx = await getContexto();
  const { db } = ctx;
  const parsed = inmuebleSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const anterior = await db.inmueble.findUnique({ where: { id }, include: incluirCambiosInmueble });
  if (!anterior) return { success: false as const, error: { _: ["Este inmueble ya no existe."] } };

  const datos = buildData(parsed.data);
  const error = await comprobarDatos(db, datos, id);
  if (error) return { success: false as const, error };
  const asesor = await resolverAsesor(ctx, parsed.data.asesorId, anterior.asesorId);
  if (!asesor.ok) return { success: false as const, error: { asesorId: [asesor.error] } };

  const actualizado = await db.$transaction(async (tx) => {
    const nuevo = await tx.inmueble.update({
      where: { id },
      data: { ...datos, asesorId: asesor.asesorId },
      include: incluirCambiosInmueble,
    });
    const cambio = cambioInmueble(anterior, nuevo);
    if (cambio) await registrarActividad(tx, cambio);
    return nuevo;
  });
  await marcarPropietario(db, actualizado.propietarioId);

  revalidatePath("/inmuebles");
  revalidatePath(`/inmuebles/${id}`);
  // Moving a flat between blocks changes both block pages.
  revalidarBloque(anterior.bloqueId);
  if (actualizado.bloqueId !== anterior.bloqueId) revalidarBloque(actualizado.bloqueId);
  return { success: true as const, inmuebleId: id };
}

export async function eliminarInmueble(id: string) {
  const { db, esDirector } = await getContexto();
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
