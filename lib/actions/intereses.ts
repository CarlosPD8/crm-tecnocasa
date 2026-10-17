"use server";

import { revalidatePath } from "next/cache";
import { dbSinZonas, getContextoEscritura } from "@/lib/db";
import type { UbicacionEnviada } from "@/lib/validations/ubicacion";
import { registrarActividad } from "@/lib/actividad";

export async function agregarInteres(inmuebleId: string, clienteId: string, ub: UbicacionEnviada) {
  const ctx = await getContextoEscritura(ub);
  if (!ctx.ok) return ctx.fallo;
  const { db } = ctx;

  // Any client of the office (found by exact DNI or phone): see buscarClientes.
  const [inmueble, cliente] = await Promise.all([
    db.inmueble.findUnique({ where: { id: inmuebleId }, select: { referencia: true } }),
    dbSinZonas(ctx).cliente.findUnique({ where: { id: clienteId }, select: { nombre: true, apellidos: true } }),
  ]);
  if (!inmueble || !cliente) {
    return { success: false as const, error: "Ese cliente o inmueble ya no existe." };
  }

  const existente = await db.interes.findFirst({
    where: { inmuebleId, clienteId },
  });
  if (existente) {
    return { success: false as const, error: "Ese cliente ya está marcado como interesado." };
  }

  await db.$transaction(async (tx) => {
    const interes = await tx.interes.create({ data: { inmuebleId, clienteId } });
    await registrarActividad(tx, {
      accion: "ALTA",
      entidad: "INTERES",
      entidadId: interes.id,
      enlace: `/inmuebles/${inmuebleId}`,
      resumen: `Añadió a ${cliente.nombre} ${cliente.apellidos} a los interesados de ${inmueble.referencia}`,
    });
  });

  revalidatePath(`/inmuebles/${inmuebleId}`);
  revalidatePath(`/clientes/${clienteId}`);
  return { success: true as const };
}

export async function quitarInteres(interesId: string, ub: UbicacionEnviada) {
  const ctx = await getContextoEscritura(ub);
  if (!ctx.ok) return ctx.fallo;
  const { db } = ctx;

  const interes = await db.interes.findUnique({
    where: { id: interesId },
    include: {
      cliente: { select: { nombre: true, apellidos: true } },
      inmueble: { select: { referencia: true } },
    },
  });
  if (!interes) return { success: false as const, error: "Ese interés ya no existe." };
  await db.$transaction(async (tx) => {
    const { count } = await tx.interes.deleteMany({ where: { id: interesId } });
    if (count) {
      await registrarActividad(tx, {
        accion: "BAJA",
        entidad: "INTERES",
        entidadId: interesId,
        enlace: `/inmuebles/${interes.inmuebleId}`,
        resumen: `Quitó a ${interes.cliente.nombre} ${interes.cliente.apellidos} de los interesados de ${interes.inmueble.referencia}`,
      });
    }
  });

  revalidatePath(`/inmuebles/${interes.inmuebleId}`);
  revalidatePath(`/clientes/${interes.clienteId}`);
  return { success: true as const };
}
