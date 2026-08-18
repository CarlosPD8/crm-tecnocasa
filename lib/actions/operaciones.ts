"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { operacionSchema, type OperacionInput } from "@/lib/validations/operacion";

export async function crearOperacion(inmuebleId: string, data: OperacionInput) {
  await requireSession();
  const parsed = operacionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const inmueble = await prisma.inmueble.findUnique({ where: { id: inmuebleId } });
  if (!inmueble) {
    return { success: false as const, error: { _: ["Inmueble no encontrado."] } };
  }
  if (inmueble.estado === "VENDIDO" || inmueble.estado === "ALQUILADO") {
    return {
      success: false as const,
      error: { _: ["Este inmueble ya tiene una operación cerrada."] },
    };
  }

  const nuevoEstado = parsed.data.tipoOperacion === "VENTA" ? "VENDIDO" : "ALQUILADO";

  await prisma.$transaction([
    prisma.operacion.create({
      data: {
        inmuebleId,
        clienteId: parsed.data.clienteId,
        tipoOperacion: parsed.data.tipoOperacion,
        precioFinal: parsed.data.precioFinal,
        notas: parsed.data.notas && parsed.data.notas.trim() !== "" ? parsed.data.notas : null,
      },
    }),
    prisma.inmueble.update({
      where: { id: inmuebleId },
      data: { estado: nuevoEstado },
    }),
  ]);

  revalidatePath(`/inmuebles/${inmuebleId}`);
  revalidatePath("/inmuebles");
  revalidatePath(`/clientes/${parsed.data.clienteId}`);
  return { success: true as const };
}
