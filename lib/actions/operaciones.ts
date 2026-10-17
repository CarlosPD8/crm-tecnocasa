"use server";

import { revalidatePath } from "next/cache";
import { dbSinZonas, getContextoEscritura } from "@/lib/db";
import type { UbicacionEnviada } from "@/lib/validations/ubicacion";
import { frase, registrarActividad } from "@/lib/actividad";
import { operacionSchema, type OperacionInput } from "@/lib/validations/operacion";

export async function crearOperacion(inmuebleId: string, data: OperacionInput, ub: UbicacionEnviada) {
  const ctx = await getContextoEscritura(ub);
  if (!ctx.ok) return ctx.fallo;
  const { db } = ctx;
  const parsed = operacionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const inmueble = await db.inmueble.findUnique({ where: { id: inmuebleId } });
  if (!inmueble) {
    return { success: false as const, error: { _: ["Inmueble no encontrado."] } };
  }
  if (inmueble.estado === "VENDIDO" || inmueble.estado === "ALQUILADO") {
    return {
      success: false as const,
      error: { _: ["Este inmueble ya tiene una operación cerrada."] },
    };
  }
  // Any client of the office (found by exact DNI or phone): see buscarClientes.
  const cliente = await dbSinZonas(ctx).cliente.findUnique({
    where: { id: parsed.data.clienteId },
    select: { nombre: true, apellidos: true },
  });
  if (!cliente) {
    return { success: false as const, error: { clienteId: ["Cliente no encontrado."] } };
  }

  const nuevoEstado = parsed.data.tipoOperacion === "VENTA" ? "VENDIDO" : "ALQUILADO";
  const notas = parsed.data.notas && parsed.data.notas.trim() !== "" ? parsed.data.notas : null;

  await db.$transaction(async (tx) => {
    const operacion = await tx.operacion.create({
      data: {
        inmuebleId,
        clienteId: parsed.data.clienteId,
        tipoOperacion: parsed.data.tipoOperacion,
        precioFinal: parsed.data.precioFinal,
        notas,
      },
    });
    await tx.inmueble.update({
      where: { id: inmuebleId },
      data: { estado: nuevoEstado },
    });
    await registrarActividad(tx, {
      accion: "OPERACION",
      entidad: "OPERACION",
      entidadId: operacion.id,
      enlace: `/inmuebles/${inmuebleId}`,
      resumen: frase.operacion(
        operacion.tipoOperacion,
        inmueble.referencia,
        operacion.precioFinal,
        `${cliente.nombre} ${cliente.apellidos}`
      ),
      detalle: notas,
    });
  });

  revalidatePath(`/inmuebles/${inmuebleId}`);
  revalidatePath("/inmuebles");
  revalidatePath(`/clientes/${parsed.data.clienteId}`);
  return { success: true as const };
}
