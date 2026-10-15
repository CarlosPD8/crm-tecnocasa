"use server";

import { revalidatePath } from "next/cache";
import { getContexto, SIN_PERMISO, type DbOficina } from "@/lib/db";
import { bloqueSchema, formatBloque, type BloqueInput } from "@/lib/validations/bloque";
import { cambioBloque, frase, registrarActividad } from "@/lib/actividad";

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
  const { db } = await getContexto();
  const parsed = bloqueSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  if (await existeOtro(db, parsed.data)) return DUPLICADO;

  const bloque = await db.$transaction(async (tx) => {
    const creado = await tx.bloque.create({ data: buildData(parsed.data) });
    await registrarActividad(tx, {
      accion: "ALTA",
      entidad: "BLOQUE",
      entidadId: creado.id,
      enlace: `/bloques/${creado.id}`,
      resumen: frase.altaBloque(formatBloque(creado)),
    });
    return creado;
  });

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
  const { db } = await getContexto();
  const parsed = bloqueSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  if (await existeOtro(db, parsed.data, id)) return DUPLICADO;

  const anterior = await db.bloque.findUnique({ where: { id } });
  const actualizado =
    anterior &&
    (await db.$transaction(async (tx) => {
      const { count } = await tx.bloque.updateMany({ where: { id }, data: buildData(parsed.data) });
      if (!count) return false;
      const cambio = cambioBloque(anterior, await tx.bloque.findUniqueOrThrow({ where: { id } }));
      if (cambio) await registrarActividad(tx, cambio);
      return true;
    }));
  if (!actualizado) return { success: false as const, error: { _: ["Este bloque ya no existe."] } };

  revalidatePath("/bloques");
  revalidatePath(`/bloques/${id}`);
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
      _count: { select: { inmuebles: true } },
    },
    orderBy: [{ calle: "asc" }, { numero: "asc" }],
    take: 10,
  });
}
