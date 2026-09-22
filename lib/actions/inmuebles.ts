"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
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
    adquisicionPotencial: data.adquisicionPotencial,
  };
}

function revalidarBloque(bloqueId: string | null) {
  if (bloqueId) revalidatePath(`/bloques/${bloqueId}`);
  revalidatePath("/bloques");
}

export async function crearInmueble(data: InmuebleInput) {
  await requireSession();
  const parsed = inmuebleSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const existente = await prisma.inmueble.findUnique({
    where: { referencia: parsed.data.referencia },
    select: { id: true },
  });
  if (existente) {
    return {
      success: false as const,
      error: { referencia: ["Ya existe un inmueble con esta referencia."] },
    };
  }

  const inmueble = await prisma.inmueble.create({ data: buildData(parsed.data) });

  revalidatePath("/inmuebles");
  revalidarBloque(inmueble.bloqueId);
  return { success: true as const, inmuebleId: inmueble.id };
}

export async function actualizarInmueble(id: string, data: InmuebleInput) {
  await requireSession();
  const parsed = inmuebleSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const existente = await prisma.inmueble.findFirst({
    where: { referencia: parsed.data.referencia, NOT: { id } },
    select: { id: true },
  });
  if (existente) {
    return {
      success: false as const,
      error: { referencia: ["Ya existe un inmueble con esta referencia."] },
    };
  }

  const anterior = await prisma.inmueble.findUnique({ where: { id }, select: { bloqueId: true } });
  const actualizado = await prisma.inmueble.update({
    where: { id },
    data: buildData(parsed.data),
  });

  revalidatePath("/inmuebles");
  revalidatePath(`/inmuebles/${id}`);
  // Moving a flat between blocks changes both block pages.
  revalidarBloque(anterior?.bloqueId ?? null);
  if (actualizado.bloqueId !== anterior?.bloqueId) revalidarBloque(actualizado.bloqueId);
  return { success: true as const, inmuebleId: id };
}

export async function eliminarInmueble(id: string) {
  await requireSession();

  const bloqueado = await prisma.inmueble.findFirst({
    where: { id, operaciones: { some: {} } },
    select: { id: true },
  });

  if (bloqueado) {
    return {
      success: false as const,
      error: "No se puede eliminar: tiene operaciones asociadas.",
    };
  }

  const borrado = await prisma.inmueble.delete({ where: { id } });
  revalidatePath("/inmuebles");
  revalidarBloque(borrado.bloqueId);
  return { success: true as const };
}
