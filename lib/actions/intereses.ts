"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";

export async function agregarInteres(inmuebleId: string, clienteId: string) {
  await requireSession();

  const existente = await prisma.interes.findFirst({
    where: { inmuebleId, clienteId },
  });
  if (existente) {
    return { success: false as const, error: "Ese cliente ya está marcado como interesado." };
  }

  await prisma.interes.create({ data: { inmuebleId, clienteId } });

  revalidatePath(`/inmuebles/${inmuebleId}`);
  revalidatePath(`/clientes/${clienteId}`);
  return { success: true as const };
}

export async function quitarInteres(interesId: string) {
  await requireSession();

  const interes = await prisma.interes.delete({ where: { id: interesId } });

  revalidatePath(`/inmuebles/${interes.inmuebleId}`);
  revalidatePath(`/clientes/${interes.clienteId}`);
  return { success: true as const };
}
