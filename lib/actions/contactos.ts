"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import {
  contactoInmuebleSchema,
  contactoSchema,
  type ContactoInmuebleInput,
  type ContactoInput,
} from "@/lib/validations/contacto";

export async function crearContacto(clienteId: string, data: ContactoInput) {
  await requireSession();
  const parsed = contactoSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const ahora = new Date();

  await prisma.$transaction([
    prisma.contacto.create({
      data: { clienteId, nota: parsed.data.nota, fecha: ahora },
    }),
    prisma.cliente.update({
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
  await requireSession();
  const parsed = contactoInmuebleSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const clienteId = parsed.data.clienteId || null;
  const ahora = new Date();

  const inmueble = await prisma.$transaction(async (tx) => {
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
