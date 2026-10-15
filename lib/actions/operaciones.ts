"use server";

import { revalidatePath } from "next/cache";
import { getContexto } from "@/lib/db";
import { frase, registrarActividad } from "@/lib/actividad";
import { operacionSchema, type OperacionInput } from "@/lib/validations/operacion";

export async function crearOperacion(inmuebleId: string, data: OperacionInput) {
  const { db } = await getContexto();
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
  const cliente = await db.cliente.findUnique({
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
