"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { bloqueSchema, type BloqueInput } from "@/lib/validations/bloque";

function toNullable(value: string | undefined) {
  return value && value.trim() !== "" ? value.trim() : null;
}

function buildData(data: BloqueInput) {
  return {
    calle: data.calle,
    numero: data.numero,
    localidad: data.localidad,
    nombre: toNullable(data.nombre),
    codigoPostal: toNullable(data.codigoPostal),
    notas: toNullable(data.notas),
  };
}

const DUPLICADO = {
  success: false as const,
  error: { numero: ["Ya existe un bloque con esta calle, número y localidad."] },
};

async function existeOtro(data: BloqueInput, excluirId?: string) {
  const otro = await prisma.bloque.findFirst({
    where: {
      calle: { equals: data.calle, mode: "insensitive" },
      numero: { equals: data.numero, mode: "insensitive" },
      localidad: { equals: data.localidad, mode: "insensitive" },
      ...(excluirId ? { NOT: { id: excluirId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(otro);
}

export async function crearBloque(data: BloqueInput) {
  await requireSession();
  const parsed = bloqueSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  if (await existeOtro(parsed.data)) return DUPLICADO;

  const bloque = await prisma.bloque.create({ data: buildData(parsed.data) });

  revalidatePath("/bloques");
  return {
    success: true as const,
    bloque: {
      id: bloque.id,
      calle: bloque.calle,
      numero: bloque.numero,
      localidad: bloque.localidad,
    },
  };
}

export async function actualizarBloque(id: string, data: BloqueInput) {
  await requireSession();
  const parsed = bloqueSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  if (await existeOtro(parsed.data, id)) return DUPLICADO;

  await prisma.bloque.update({ where: { id }, data: buildData(parsed.data) });

  revalidatePath("/bloques");
  revalidatePath(`/bloques/${id}`);
  return { success: true as const, bloqueId: id };
}

export async function eliminarBloque(id: string) {
  await requireSession();

  const pisos = await prisma.inmueble.count({ where: { bloqueId: id } });
  if (pisos > 0) {
    return {
      success: false as const,
      error:
        pisos === 1
          ? "No se puede eliminar: tiene 1 inmueble asociado. Quítalo del bloque primero."
          : `No se puede eliminar: tiene ${pisos} inmuebles asociados. Quítalos del bloque primero.`,
    };
  }

  await prisma.bloque.delete({ where: { id } });
  revalidatePath("/bloques");
  return { success: true as const };
}

export async function buscarBloques(query: string) {
  await requireSession();

  const q = query.trim();
  if (!q) return [];

  return prisma.bloque.findMany({
    where: {
      OR: [
        { calle: { contains: q, mode: "insensitive" } },
        { numero: { contains: q, mode: "insensitive" } },
        { nombre: { contains: q, mode: "insensitive" } },
        { localidad: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      calle: true,
      numero: true,
      localidad: true,
      nombre: true,
      _count: { select: { inmuebles: true } },
    },
    orderBy: [{ calle: "asc" }, { numero: "asc" }],
    take: 10,
  });
}
