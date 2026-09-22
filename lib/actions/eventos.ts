"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import {
  aFecha,
  aValor,
  DIA_RE,
  eventoSchema,
  moverEventoSchema,
  type EventoInput,
  type ItemCalendario,
  type MoverEventoInput,
} from "@/lib/validations/evento";
import { TIPO_OPERACION_LABELS } from "@/lib/validations/inmueble";
import type { Prisma } from "@/lib/generated/prisma/client";

const DIA_MS = 24 * 60 * 60 * 1000;

const incluirEnlaces = {
  cliente: { select: { id: true, nombre: true, apellidos: true } },
  inmueble: { select: { id: true, referencia: true } },
} as const;

type EventoConEnlaces = Prisma.EventoGetPayload<{ include: typeof incluirEnlaces }>;

function eventoAItem(e: EventoConEnlaces): ItemCalendario {
  return {
    id: e.id,
    fuente: "evento",
    titulo: e.titulo,
    todoElDia: e.todoElDia,
    inicio: aValor(e.inicio, e.todoElDia),
    fin: aValor(e.fin, e.todoElDia),
    tipo: e.tipo,
    notas: e.notas,
    cliente: e.cliente ? { id: e.cliente.id, nombre: `${e.cliente.nombre} ${e.cliente.apellidos}` } : null,
    inmueble: e.inmueble,
  };
}

/**
 * Everything the calendar shows between two instants: agenda events plus what
 * the CRM already knows (scheduled follow-ups, logged contacts, closed deals).
 */
export async function obtenerCalendario(desdeISO: string, hastaISO: string): Promise<ItemCalendario[]> {
  await requireSession();
  const desde = new Date(desdeISO);
  const hasta = new Date(hastaISO);
  if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) return [];
  // All-day values sit at UTC midnight: widen by a day so the view's edges
  // (which are local midnights) never drop one.
  const desdeAmplio = new Date(desde.getTime() - DIA_MS);
  const hastaAmplio = new Date(hasta.getTime() + DIA_MS);

  const [eventos, proximos, contactos, operaciones] = await Promise.all([
    prisma.evento.findMany({
      where: { inicio: { lt: hastaAmplio }, fin: { gte: desdeAmplio } },
      include: incluirEnlaces,
      orderBy: { inicio: "asc" },
    }),
    prisma.cliente.findMany({
      where: { fechaProximoContacto: { gte: desdeAmplio, lt: hastaAmplio } },
      select: { id: true, nombre: true, apellidos: true, telefono: true, fechaProximoContacto: true },
    }),
    prisma.contacto.findMany({
      where: { fecha: { gte: desde, lt: hasta } },
      select: {
        id: true,
        fecha: true,
        nota: true,
        ...incluirEnlaces,
      },
      orderBy: { fecha: "asc" },
    }),
    prisma.operacion.findMany({
      where: { fecha: { gte: desdeAmplio, lt: hastaAmplio } },
      select: { id: true, fecha: true, tipoOperacion: true, notas: true, ...incluirEnlaces },
    }),
  ]);

  const nombre = (c: { nombre: string; apellidos: string }) => `${c.nombre} ${c.apellidos}`;

  return [
    ...eventos.map(eventoAItem),
    ...proximos.map((c) => ({
      id: c.id,
      fuente: "proximo" as const,
      titulo: `Llamar a ${nombre(c)}`,
      todoElDia: true,
      inicio: aValor(c.fechaProximoContacto!, true),
      fin: null,
      notas: c.telefono,
      cliente: { id: c.id, nombre: nombre(c) },
    })),
    ...contactos.map((c) => ({
      id: c.id,
      fuente: "contacto" as const,
      titulo: c.cliente ? nombre(c.cliente) : `Inmueble ${c.inmueble?.referencia ?? ""}`.trim(),
      todoElDia: false,
      inicio: c.fecha.toISOString(),
      fin: null,
      notas: c.nota,
      cliente: c.cliente ? { id: c.cliente.id, nombre: nombre(c.cliente) } : null,
      inmueble: c.inmueble,
    })),
    ...operaciones.map((o) => ({
      id: o.id,
      fuente: "operacion" as const,
      titulo: `${TIPO_OPERACION_LABELS[o.tipoOperacion]} ${o.inmueble.referencia}`,
      todoElDia: true,
      inicio: aValor(o.fecha, true),
      fin: null,
      notas: o.notas,
      cliente: { id: o.cliente.id, nombre: nombre(o.cliente) },
      inmueble: o.inmueble,
    })),
  ];
}

function datosEvento(data: EventoInput) {
  return {
    titulo: data.titulo,
    tipo: data.tipo,
    todoElDia: data.todoElDia,
    inicio: aFecha(data.inicio, data.todoElDia),
    fin: aFecha(data.fin, data.todoElDia),
    notas: data.notas?.trim() || null,
    clienteId: data.clienteId || null,
    inmuebleId: data.inmuebleId || null,
  };
}

export async function crearEvento(data: EventoInput) {
  await requireSession();
  const parsed = eventoSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  const evento = await prisma.evento.create({ data: datosEvento(parsed.data), include: incluirEnlaces });
  return { success: true as const, evento: eventoAItem(evento) };
}

export async function actualizarEvento(id: string, data: EventoInput) {
  await requireSession();
  const parsed = eventoSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  const evento = await prisma.evento.update({
    where: { id },
    data: datosEvento(parsed.data),
    include: incluirEnlaces,
  });
  return { success: true as const, evento: eventoAItem(evento) };
}

/** Drag & drop and resize: only the dates change. */
export async function moverEvento(id: string, data: MoverEventoInput) {
  await requireSession();
  const parsed = moverEventoSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: "Esas fechas no son válidas." };
  }
  const { todoElDia, inicio, fin } = parsed.data;
  await prisma.evento.update({
    where: { id },
    data: { todoElDia, inicio: aFecha(inicio, todoElDia), fin: aFecha(fin, todoElDia) },
  });
  return { success: true as const };
}

export async function eliminarEvento(id: string) {
  await requireSession();
  await prisma.evento.delete({ where: { id } });
  return { success: true as const };
}

/** Dragging a follow-up in the calendar reschedules the client's next contact. */
export async function moverProximoContacto(clienteId: string, dia: string) {
  await requireSession();
  if (!DIA_RE.test(dia)) {
    return { success: false as const, error: "Fecha no válida." };
  }
  await prisma.cliente.update({
    where: { id: clienteId },
    data: { fechaProximoContacto: aFecha(dia, true) },
  });
  revalidatePath("/");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
  return { success: true as const };
}
