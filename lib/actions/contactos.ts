"use server";

import { revalidatePath } from "next/cache";
import { existe, getContexto } from "@/lib/db";
import {
  contactoInmuebleSchema,
  contactoSchema,
  type ContactoInmuebleInput,
  type ContactoInput,
} from "@/lib/validations/contacto";

export async function crearContacto(clienteId: string, data: ContactoInput) {
  const { db } = await getContexto();
  const parsed = contactoSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  if (!(await existe(db, "cliente", clienteId))) {
    return { success: false as const, error: { nota: ["Este cliente ya no existe."] } };
  }

  const ahora = new Date();

  await db.$transaction([
    db.contacto.create({
      data: { clienteId, nota: parsed.data.nota, fecha: ahora },
    }),
    db.cliente.update({
      where: { id: clienteId },
      data: { fechaUltimoContacto: ahora },
    }),
  ]);

  revalidatePath(`/clientes/${clienteId}`);
  return { success: true as const };
}

/**
 * Logs a contact about a property. If a person is given (the owner by default),
 * the same record also lands in that client's history and both "last contact"
 * dates move together.
 */
export async function crearContactoInmueble(inmuebleId: string, data: ContactoInmuebleInput) {
  const { db } = await getContexto();
  const parsed = contactoInmuebleSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const clienteId = parsed.data.clienteId || null;
  if (!(await existe(db, "inmueble", inmuebleId))) {
    return { success: false as const, error: { nota: ["Este inmueble ya no existe."] } };
  }
  if (clienteId && !(await existe(db, "cliente", clienteId))) {
    return { success: false as const, error: { clienteId: ["Ese cliente ya no existe."] } };
  }
  const ahora = new Date();

  const inmueble = await db.$transaction(async (tx) => {
    await tx.contacto.create({
      data: { inmuebleId, clienteId, nota: parsed.data.nota, fecha: ahora },
    });
    if (clienteId) {
      await tx.cliente.update({ where: { id: clienteId }, data: { fechaUltimoContacto: ahora } });
    }
    return tx.inmueble.update({
      where: { id: inmuebleId },
      data: { fechaUltimoContacto: ahora },
      select: { bloqueId: true },
    });
  });

  revalidatePath(`/inmuebles/${inmuebleId}`);
  revalidatePath("/inmuebles");
  if (clienteId) revalidatePath(`/clientes/${clienteId}`);
  if (inmueble.bloqueId) revalidatePath(`/bloques/${inmueble.bloqueId}`);
  return { success: true as const };
}
