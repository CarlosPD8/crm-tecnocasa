"use server";

import { revalidatePath } from "next/cache";
import { existe, getContexto } from "@/lib/db";

export async function agregarInteres(inmuebleId: string, clienteId: string) {
  const { db } = await getContexto();

  if (!(await existe(db, "inmueble", inmuebleId)) || !(await existe(db, "cliente", clienteId))) {
    return { success: false as const, error: "Ese cliente o inmueble ya no existe." };
  }

  const existente = await db.interes.findFirst({
    where: { inmuebleId, clienteId },
  });
  if (existente) {
    return { success: false as const, error: "Ese cliente ya está marcado como interesado." };
  }

  await db.interes.create({ data: { inmuebleId, clienteId } });

  revalidatePath(`/inmuebles/${inmuebleId}`);
  revalidatePath(`/clientes/${clienteId}`);
  return { success: true as const };
}

export async function quitarInteres(interesId: string) {
  const { db } = await getContexto();

  const interes = await db.interes.findUnique({ where: { id: interesId } });
  if (!interes) return { success: false as const, error: "Ese interés ya no existe." };
  await db.interes.deleteMany({ where: { id: interesId } });

  revalidatePath(`/inmuebles/${interes.inmuebleId}`);
  revalidatePath(`/clientes/${interes.clienteId}`);
  return { success: true as const };
}
