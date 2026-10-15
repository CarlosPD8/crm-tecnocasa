"use server";

import { revalidatePath } from "next/cache";

import { esUnicoViolado, getContexto, SIN_PERMISO, type Contexto, type DbOficina } from "@/lib/db";
import { cambioZona, frase, incluirCambiosZona, nombresAsesores, registrarActividad } from "@/lib/actividad";
import { moverYBorrarZona } from "@/lib/zonas";
import { zonaSchema, type ZonaInput } from "@/lib/validations/zona";

// Zones and who works them: director only (the scope extension also refuses
// any write on zones from an advisor).

type Errores = Record<string, string[] | undefined>;

async function contextoDirector(): Promise<Contexto | null> {
  const ctx = await getContexto();
  return ctx.esDirector ? ctx : null;
}

const NOMBRE_REPETIDO = {
  success: false as const,
  error: { nombre: ["Ya hay una zona con ese nombre."] } as Errores,
};

function toNullable(value: string | undefined) {
  return value && value.trim() !== "" ? value.trim() : null;
}

async function nombreOcupado(db: DbOficina, nombre: string, excluirId?: string) {
  const otra = await db.zona.findFirst({
    where: { nombre: { equals: nombre, mode: "insensitive" }, ...(excluirId ? { NOT: { id: excluirId } } : {}) },
    select: { id: true },
  });
  return Boolean(otra);
}

/** The ids, if all are advisors of the office; null otherwise. */
async function asesoresValidos(db: DbOficina, ids: string[]) {
  const unicos = [...new Set(ids)];
  if (!unicos.length) return unicos;
  const validos = await db.usuario.count({ where: { id: { in: unicos }, rol: "ASESOR" } });
  return validos === unicos.length ? unicos : null;
}

/** Names are shown everywhere (badges, filters, PDFs): refresh it all. */
function revalidarTodo() {
  revalidatePath("/", "layout");
}

export async function crearZona(data: ZonaInput) {
  const ctx = await contextoDirector();
  if (!ctx) return { success: false as const, error: { _: [SIN_PERMISO.error] } as Errores };

  const parsed = zonaSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors as Errores };
  }
  const { nombre, color, notas } = parsed.data;
  if (await nombreOcupado(ctx.db, nombre)) return NOMBRE_REPETIDO;
  const asesorIds = await asesoresValidos(ctx.db, parsed.data.asesorIds);
  if (!asesorIds) return { success: false as const, error: { asesorIds: ["Elige asesores de la oficina."] } as Errores };

  try {
    const zona = await ctx.db.$transaction(async (tx) => {
      const creada = await tx.zona.create({ data: { nombre, color, notas: toNullable(notas) } });
      if (asesorIds.length) {
        await tx.zonaAsesor.createMany({ data: asesorIds.map((usuarioId) => ({ zonaId: creada.id, usuarioId })) });
      }
      const conAsesores = await tx.zona.findUniqueOrThrow({ where: { id: creada.id }, include: incluirCambiosZona });
      const asesores = nombresAsesores(conAsesores);
      await registrarActividad(tx, {
        accion: "ALTA",
        entidad: "ZONA",
        entidadId: creada.id,
        enlace: "/zonas",
        resumen: frase.altaZona(creada.nombre) + (asesores ? ` para ${asesores}` : ""),
      });
      return creada;
    });
    revalidarTodo();
    return { success: true as const, zonaId: zona.id };
  } catch (e) {
    if (esUnicoViolado(e)) return NOMBRE_REPETIDO;
    throw e;
  }
}

/** Name, color, notes and the advisors who work it (the list replaces the old one). */
export async function actualizarZona(id: string, data: ZonaInput) {
  const ctx = await contextoDirector();
  if (!ctx) return { success: false as const, error: { _: [SIN_PERMISO.error] } as Errores };

  const parsed = zonaSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors as Errores };
  }
  const { nombre, color, notas } = parsed.data;
  if (await nombreOcupado(ctx.db, nombre, id)) return NOMBRE_REPETIDO;
  const asesorIds = await asesoresValidos(ctx.db, parsed.data.asesorIds);
  if (!asesorIds) return { success: false as const, error: { asesorIds: ["Elige asesores de la oficina."] } as Errores };

  try {
    const existia = await ctx.db.$transaction(async (tx) => {
      const antes = await tx.zona.findUnique({ where: { id }, include: incluirCambiosZona });
      if (!antes) return false;
      await tx.zona.update({ where: { id }, data: { nombre, color, notas: toNullable(notas) } });
      await tx.zonaAsesor.deleteMany({ where: { zonaId: id, usuarioId: { notIn: asesorIds } } });
      if (asesorIds.length) {
        await tx.zonaAsesor.createMany({
          data: asesorIds.map((usuarioId) => ({ zonaId: id, usuarioId })),
          skipDuplicates: true,
        });
      }
      const despues = await tx.zona.findUniqueOrThrow({ where: { id }, include: incluirCambiosZona });
      const cambio = cambioZona(antes, despues);
      if (cambio) await registrarActividad(tx, cambio);
      return true;
    });
    if (!existia) return { success: false as const, error: { _: ["Esta zona ya no existe."] } as Errores };
  } catch (e) {
    if (esUnicoViolado(e)) return NOMBRE_REPETIDO;
    throw e;
  }

  revalidarTodo();
  return { success: true as const };
}

/** Moves its blocks and loose properties to `destinoId` (null if it has none), then deletes it. */
export async function eliminarZona(id: string, destinoId: string | null) {
  const ctx = await contextoDirector();
  if (!ctx) return SIN_PERMISO;
  if (id === destinoId) return { success: false as const, error: "Elige otra zona a la que pasar sus pisos." };

  const [zona, destino] = await Promise.all([
    ctx.db.zona.findUnique({
      where: { id },
      select: { nombre: true, _count: { select: { bloques: true, inmuebles: true } } },
    }),
    destinoId ? ctx.db.zona.findUnique({ where: { id: destinoId }, select: { nombre: true } }) : null,
  ]);
  if (!zona) return { success: false as const, error: "Esta zona ya no existe." };
  if (destinoId && !destino) return { success: false as const, error: "La zona de destino ya no existe." };
  if (!destino && zona._count.bloques + zona._count.inmuebles > 0) {
    return { success: false as const, error: "Elige a qué zona pasan sus bloques y pisos." };
  }

  await ctx.db.$transaction(async (tx) => {
    const movidos = await moverYBorrarZona(tx, id, destinoId);
    await registrarActividad(tx, {
      accion: "BAJA",
      entidad: "ZONA",
      entidadId: id,
      enlace: "/zonas",
      resumen: frase.bajaZona(zona.nombre, destino?.nombre ?? "", movidos),
    });
  });

  revalidarTodo();
  return { success: true as const };
}
