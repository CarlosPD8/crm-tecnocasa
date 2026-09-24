"use server";

import { revalidatePath } from "next/cache";
import { existe, getContexto } from "@/lib/db";
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
  if (!(await existe(db, "cliente", parsed.data.clienteId))) {
    return { success: false as const, error: { clienteId: ["Cliente no encontrado."] } };
  }

  const nuevoEstado = parsed.data.tipoOperacion === "VENTA" ? "VENDIDO" : "ALQUILADO";

  await db.$transaction([
    db.operacion.create({
      data: {
        inmuebleId,
        clienteId: parsed.data.clienteId,
        tipoOperacion: parsed.data.tipoOperacion,
        precioFinal: parsed.data.precioFinal,
        notas: parsed.data.notas && parsed.data.notas.trim() !== "" ? parsed.data.notas : null,
      },
    }),
    db.inmueble.update({
      where: { id: inmuebleId },
      data: { estado: nuevoEstado },
    }),
  ]);

  revalidatePath(`/inmuebles/${inmuebleId}`);
  revalidatePath("/inmuebles");
  revalidatePath(`/clientes/${parsed.data.clienteId}`);
  return { success: true as const };
}
