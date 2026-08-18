"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { contactoSchema, type ContactoInput } from "@/lib/validations/contacto";

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
