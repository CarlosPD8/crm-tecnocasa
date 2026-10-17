"use server";

import { revalidatePath } from "next/cache";
import { dbSinZonas, getContextoEscritura } from "@/lib/db";
import type { UbicacionEnviada } from "@/lib/validations/ubicacion";
import { frase, registrarActividad } from "@/lib/actividad";
import {
  contactoInmuebleSchema,
  contactoSchema,
  proximoContactoData,
  type ContactoInmuebleInput,
  type ContactoInput,
} from "@/lib/validations/contacto";

export async function crearContacto(clienteId: string, data: ContactoInput, ub: UbicacionEnviada) {
  const ctx = await getContextoEscritura(ub);
  if (!ctx.ok) return ctx.fallo;
  const { db } = ctx;
  const parsed = contactoSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  const cliente = await db.cliente.findUnique({ where: { id: clienteId }, select: { nombre: true, apellidos: true } });
  if (!cliente) {
    return { success: false as const, error: { nota: ["Este cliente ya no existe."] } };
  }

  const ahora = new Date();
  const proximo = proximoContactoData(parsed.data.fechaProximoContacto);

  await db.$transaction(async (tx) => {
    const contacto = await tx.contacto.create({
      data: { clienteId, nota: parsed.data.nota, fecha: ahora },
    });
    await tx.cliente.update({
      where: { id: clienteId },
      data: { fechaUltimoContacto: ahora, ...proximo },
    });
    await registrarActividad(
      tx,
      {
        accion: "CONTACTO",
        entidad: "CONTACTO",
        entidadId: contacto.id,
        enlace: `/clientes/${clienteId}`,
        resumen: frase.contacto(`${cliente.nombre} ${cliente.apellidos}`, null, proximo.fechaProximoContacto),
        detalle: parsed.data.nota,
      },
      ahora
    );
  });

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
  revalidatePath("/");
  return { success: true as const };
}

/**
 * Logs a contact about a property. If a person is given (the owner by default),
 * the same record also lands in that client's history and both "last contact"
 * dates move together. The next follow-up belongs to the property.
 */
export async function crearContactoInmueble(inmuebleId: string, data: ContactoInmuebleInput, ub: UbicacionEnviada) {
  const ctx = await getContextoEscritura(ub);
  if (!ctx.ok) return ctx.fallo;
  const { db } = ctx;
  const parsed = contactoInmuebleSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const clienteId = parsed.data.clienteId || null;
  const datosInmueble = await db.inmueble.findUnique({ where: { id: inmuebleId }, select: { referencia: true } });
  if (!datosInmueble) {
    return { success: false as const, error: { nota: ["Este inmueble ya no existe."] } };
  }
  // Any client of the office: an advisor may find one of another zone by exact
  // DNI or phone. From now on they see them (contacted about their flat).
  const cliente = clienteId
    ? await dbSinZonas(ctx).cliente.findUnique({ where: { id: clienteId }, select: { nombre: true, apellidos: true } })
    : null;
  if (clienteId && !cliente) {
    return { success: false as const, error: { clienteId: ["Ese cliente ya no existe."] } };
  }
  const ahora = new Date();
  const proximo = proximoContactoData(parsed.data.fechaProximoContacto);

  const inmueble = await db.$transaction(async (tx) => {
    const contacto = await tx.contacto.create({
      data: { inmuebleId, clienteId, nota: parsed.data.nota, fecha: ahora },
    });
    if (clienteId) {
      await tx.cliente.update({ where: { id: clienteId }, data: { fechaUltimoContacto: ahora } });
    }
    await registrarActividad(
      tx,
      {
        accion: "CONTACTO",
        entidad: "CONTACTO",
        entidadId: contacto.id,
        enlace: `/inmuebles/${inmuebleId}`,
        resumen: frase.contacto(
          cliente ? `${cliente.nombre} ${cliente.apellidos}` : null,
          datosInmueble.referencia,
          proximo.fechaProximoContacto
        ),
        detalle: parsed.data.nota,
      },
      ahora
    );
    return tx.inmueble.update({
      where: { id: inmuebleId },
      data: { fechaUltimoContacto: ahora, ...proximo },
      select: { bloqueId: true },
    });
  });

  revalidatePath(`/inmuebles/${inmuebleId}`);
  revalidatePath("/inmuebles");
  revalidatePath("/");
  if (clienteId) revalidatePath(`/clientes/${clienteId}`);
  if (inmueble.bloqueId) revalidatePath(`/bloques/${inmueble.bloqueId}`);
  return { success: true as const };
}
