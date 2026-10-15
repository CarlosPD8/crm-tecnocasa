"use server";

import { revalidatePath } from "next/cache";
import { esUnicoViolado, getContexto, resolverZona, SIN_PERMISO, type DbOficina } from "@/lib/db";
import { bloqueSchema, formatBloque, type BloqueInput } from "@/lib/validations/bloque";
import { cambioBloque, frase, incluirCambiosBloque, registrarActividad } from "@/lib/actividad";

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
  error: { numero: ["Ya existe un bloque con esta calle, número y localidad."] } as Record<string, string[]>,
};

// The same address in a zone the advisor doesn't see: the database refuses it.
const DUPLICADO_EN_OTRA_ZONA = {
  success: false as const,
  error: {
    numero: ["Ese bloque ya existe en una zona que no es tuya. Pide al director que te la asigne."],
  } as Record<string, string[]>,
};

async function existeOtro(db: DbOficina, data: BloqueInput, excluirId?: string) {
  const otro = await db.bloque.findFirst({
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
  const ctx = await getContexto();
  const { db } = ctx;
  const parsed = bloqueSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  const zona = await resolverZona(ctx, parsed.data.zonaId);
  if (!zona.ok) return { success: false as const, error: { zonaId: [zona.error] } as Record<string, string[]> };
  if (await existeOtro(db, parsed.data)) return DUPLICADO;

  let bloque;
  try {
    bloque = await db.$transaction(async (tx) => {
      const creado = await tx.bloque.create({
        data: { ...buildData(parsed.data), zonaId: zona.zonaId! },
        include: { zona: { select: { id: true, nombre: true, color: true } } },
      });
      await registrarActividad(tx, {
        accion: "ALTA",
        entidad: "BLOQUE",
        entidadId: creado.id,
        enlace: `/bloques/${creado.id}`,
        resumen: frase.altaBloque(formatBloque(creado)),
      });
      return creado;
    });
  } catch (e) {
    if (esUnicoViolado(e)) return DUPLICADO_EN_OTRA_ZONA;
    throw e;
  }

  revalidatePath("/bloques");
  return {
    success: true as const,
    bloque: {
      id: bloque.id,
      calle: bloque.calle,
      numero: bloque.numero,
      localidad: bloque.localidad,
      zona: bloque.zona,
    },
  };
}

export async function actualizarBloque(id: string, data: BloqueInput) {
  const ctx = await getContexto();
  const { db } = ctx;
  const parsed = bloqueSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  const anterior = await db.bloque.findUnique({ where: { id }, include: incluirCambiosBloque });
  if (!anterior) return { success: false as const, error: { _: ["Este bloque ya no existe."] } as Record<string, string[]> };
  const zona = await resolverZona(ctx, parsed.data.zonaId, anterior.zonaId);
  if (!zona.ok) return { success: false as const, error: { zonaId: [zona.error] } as Record<string, string[]> };
  if (await existeOtro(db, parsed.data, id)) return DUPLICADO;

  let actualizado;
  try {
    actualizado = await db.$transaction(async (tx) => {
      const { count } = await tx.bloque.updateMany({
        where: { id },
        // A new zone reaches its flats through the trigger Bloque_zona_a_pisos.
        data: { ...buildData(parsed.data), ...(zona.zonaId ? { zonaId: zona.zonaId } : {}) },
      });
      if (!count) return false;
      const despues = await tx.bloque.findUniqueOrThrow({ where: { id }, include: incluirCambiosBloque });
      const pisos = zona.zonaId ? await tx.inmueble.count({ where: { bloqueId: id } }) : 0;
      const cambio = cambioBloque(anterior, despues, pisos);
      if (cambio) await registrarActividad(tx, cambio);
      return true;
    });
  } catch (e) {
    if (esUnicoViolado(e)) return DUPLICADO_EN_OTRA_ZONA;
    throw e;
  }
  if (!actualizado) return { success: false as const, error: { _: ["Este bloque ya no existe."] } as Record<string, string[]> };

  revalidatePath("/bloques");
  revalidatePath(`/bloques/${id}`);
  if (zona.zonaId) revalidatePath("/inmuebles");
  return { success: true as const, bloqueId: id };
}

export async function eliminarBloque(id: string) {
  const { db, esDirector } = await getContexto();
  if (!esDirector) return SIN_PERMISO;

  const pisos = await db.inmueble.count({ where: { bloqueId: id } });
  if (pisos > 0) {
    return {
      success: false as const,
      error:
        pisos === 1
          ? "No se puede eliminar: tiene 1 inmueble asociado. Quítalo del bloque primero."
          : `No se puede eliminar: tiene ${pisos} inmuebles asociados. Quítalos del bloque primero.`,
    };
  }

  const bloque = await db.bloque.findUnique({ where: { id }, select: { calle: true, numero: true } });
  const borrado =
    bloque &&
    (await db.$transaction(async (tx) => {
      const { count } = await tx.bloque.deleteMany({ where: { id } });
      if (count) {
        await registrarActividad(tx, {
          accion: "BAJA",
          entidad: "BLOQUE",
          entidadId: id,
          resumen: `Borró el bloque ${formatBloque(bloque)}`,
        });
      }
      return count > 0;
    }));
  if (!borrado) return { success: false as const, error: "Este bloque ya no existe." };
  revalidatePath("/bloques");
  return { success: true as const };
}

export async function buscarBloques(query: string) {
  const { db } = await getContexto();

  const q = query.trim();
  if (!q) return [];

  return db.bloque.findMany({
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
      zona: { select: { id: true, nombre: true, color: true } },
      _count: { select: { inmuebles: true } },
    },
    orderBy: [{ calle: "asc" }, { numero: "asc" }],
    take: 10,
  });
}
