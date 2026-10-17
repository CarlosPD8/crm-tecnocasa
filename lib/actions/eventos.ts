"use server";

import { revalidatePath } from "next/cache";
import { existe, getContexto, getContextoEscritura, SIN_PERMISO, type Contexto, type DbOficina } from "@/lib/db";
import type { UbicacionEnviada } from "@/lib/validations/ubicacion";
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
import { cambioEvento, cuandoEvento, fechaCorta, frase, registrarActividad } from "@/lib/actividad";

const DIA_MS = 24 * 60 * 60 * 1000;

const incluirEnlaces = {
  cliente: { select: { id: true, nombre: true, apellidos: true } },
  inmueble: { select: { id: true, referencia: true } },
  creadoPor: { select: { nombre: true } },
} as const;

type EventoConEnlaces = Prisma.EventoGetPayload<{ include: typeof incluirEnlaces }>;

function eventoAItem(e: EventoConEnlaces, ctx: Pick<Contexto, "usuario" | "esDirector">): ItemCalendario {
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
    autor: e.creadoPor?.nombre ?? null,
    puedeEliminar: ctx.esDirector || e.creadoPorId === ctx.usuario.id,
  };
}

/**
 * Everything the calendar shows between two instants: agenda events plus what
 * the CRM already knows (scheduled follow-ups, logged contacts, closed deals).
 */
export async function obtenerCalendario(desdeISO: string, hastaISO: string): Promise<ItemCalendario[]> {
  const ctx = await getContexto();
  const { db } = ctx;
  const desde = new Date(desdeISO);
  const hasta = new Date(hastaISO);
  if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) return [];
  // All-day values sit at UTC midnight: widen by a day so the view's edges
  // (which are local midnights) never drop one.
  const desdeAmplio = new Date(desde.getTime() - DIA_MS);
  const hastaAmplio = new Date(hasta.getTime() + DIA_MS);

  const [eventos, proximos, proximosInmuebles, contactos, operaciones, finesAlquiler] = await Promise.all([
    db.evento.findMany({
      where: { inicio: { lt: hastaAmplio }, fin: { gte: desdeAmplio } },
      include: incluirEnlaces,
      orderBy: { inicio: "asc" },
    }),
    db.cliente.findMany({
      where: { fechaProximoContacto: { gte: desdeAmplio, lt: hastaAmplio } },
      select: { id: true, nombre: true, apellidos: true, telefono: true, fechaProximoContacto: true },
    }),
    db.inmueble.findMany({
      where: { fechaProximoContacto: { gte: desdeAmplio, lt: hastaAmplio } },
      select: {
        id: true,
        referencia: true,
        direccion: true,
        fechaProximoContacto: true,
        propietario: { select: { id: true, nombre: true, apellidos: true, telefono: true } },
      },
    }),
    db.contacto.findMany({
      where: { fecha: { gte: desde, lt: hasta } },
      select: {
        id: true,
        fecha: true,
        nota: true,
        ...incluirEnlaces,
      },
      orderBy: { fecha: "asc" },
    }),
    db.operacion.findMany({
      where: { fecha: { gte: desdeAmplio, lt: hastaAmplio } },
      select: { id: true, fecha: true, tipoOperacion: true, notas: true, ...incluirEnlaces },
    }),
    db.inmueble.findMany({
      where: { fechaFinAlquiler: { gte: desdeAmplio, lt: hastaAmplio } },
      select: {
        id: true,
        referencia: true,
        direccion: true,
        fechaFinAlquiler: true,
        propietario: { select: { id: true, nombre: true, apellidos: true } },
      },
    }),
  ]);

  const nombre = (c: { nombre: string; apellidos: string }) => `${c.nombre} ${c.apellidos}`;

  return [
    ...eventos.map((e) => eventoAItem(e, ctx)),
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
    // A property follow-up: no `cliente` (that marks it as the property's own).
    ...proximosInmuebles.map((i) => ({
      id: i.id,
      fuente: "proximo" as const,
      titulo: `Contactar ${i.referencia} · ${i.direccion}`,
      todoElDia: true,
      inicio: aValor(i.fechaProximoContacto!, true),
      fin: null,
      notas: i.propietario?.telefono ?? null,
      cliente: null,
      inmueble: { id: i.id, referencia: i.referencia },
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
      autor: c.creadoPor?.nombre ?? null,
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
      autor: o.creadoPor?.nombre ?? null,
    })),
    ...finesAlquiler.map((i) => ({
      id: i.id,
      fuente: "finAlquiler" as const,
      titulo: `Fin alquiler ${i.referencia}`,
      todoElDia: true,
      inicio: aValor(i.fechaFinAlquiler!, true),
      fin: null,
      notas: i.direccion,
      cliente: i.propietario ? { id: i.propietario.id, nombre: nombre(i.propietario) } : null,
      inmueble: { id: i.id, referencia: i.referencia },
    })),
  ];
}

type Enlaces = { clienteId: string | null; inmuebleId: string | null };

/**
 * Error for the dialog when a newly linked client or property is not one the
 * user can see. Links that don't change aren't checked again.
 */
async function comprobarEnlaces(db: DbOficina, nuevos: Enlaces, anteriores?: Enlaces) {
  if (nuevos.clienteId && nuevos.clienteId !== anteriores?.clienteId && !(await existe(db, "cliente", nuevos.clienteId))) {
    return { clienteId: ["Ese cliente ya no existe."] };
  }
  if (
    nuevos.inmuebleId &&
    nuevos.inmuebleId !== anteriores?.inmuebleId &&
    !(await existe(db, "inmueble", nuevos.inmuebleId))
  ) {
    return { inmuebleId: ["Ese inmueble ya no existe."] };
  }
  return null;
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

export async function crearEvento(data: EventoInput, ub: UbicacionEnviada) {
  const ctx = await getContextoEscritura(ub);
  if (!ctx.ok) return ctx.fallo;
  const { db } = ctx;
  const parsed = eventoSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  const datos = datosEvento(parsed.data);
  const enlaces = await comprobarEnlaces(db, datos);
  if (enlaces) return { success: false as const, error: enlaces };
  const evento = await db.$transaction(async (tx) => {
    const creado = await tx.evento.create({ data: datos, include: incluirEnlaces });
    await registrarActividad(tx, {
      accion: "ALTA",
      entidad: "EVENTO",
      entidadId: creado.id,
      enlace: "/calendario",
      resumen: frase.cita(creado.titulo, cuandoEvento(creado)),
    });
    return creado;
  });
  return { success: true as const, evento: eventoAItem(evento, ctx) };
}

export async function actualizarEvento(id: string, data: EventoInput, ub: UbicacionEnviada) {
  const ctx = await getContextoEscritura(ub);
  if (!ctx.ok) return ctx.fallo;
  const { db } = ctx;
  const parsed = eventoSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  const anterior = await db.evento.findUnique({ where: { id }, include: incluirEnlaces });
  if (!anterior) {
    return { success: false as const, error: { titulo: ["Este evento ya no existe."] } };
  }
  const datos = datosEvento(parsed.data);
  // An advisor's own appointment may point to someone of another zone: the
  // dialog doesn't show that link, and saving keeps it.
  if (anterior.clienteId && !anterior.cliente) datos.clienteId = anterior.clienteId;
  if (anterior.inmuebleId && !anterior.inmueble) datos.inmuebleId = anterior.inmuebleId;
  const enlaces = await comprobarEnlaces(db, datos, anterior);
  if (enlaces) return { success: false as const, error: enlaces };
  const evento = await db.$transaction(async (tx) => {
    const nuevo = await tx.evento.update({
      where: { id },
      data: datos,
      include: incluirEnlaces,
    });
    const cambio = cambioEvento(anterior, nuevo);
    if (cambio) await registrarActividad(tx, cambio);
    return nuevo;
  });
  return { success: true as const, evento: eventoAItem(evento, ctx) };
}

/** Drag & drop and resize: only the dates change. */
export async function moverEvento(id: string, data: MoverEventoInput, ub: UbicacionEnviada) {
  const ctx = await getContextoEscritura(ub);
  if (!ctx.ok) return ctx.fallo;
  const { db } = ctx;
  const parsed = moverEventoSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: "Esas fechas no son válidas." };
  }
  const { todoElDia, inicio, fin } = parsed.data;
  const datos = { todoElDia, inicio: aFecha(inicio, todoElDia), fin: aFecha(fin, todoElDia) };
  const anterior = await db.evento.findUnique({ where: { id }, select: { titulo: true, inicio: true, todoElDia: true } });
  const movido =
    anterior &&
    (await db.$transaction(async (tx) => {
      const { count } = await tx.evento.updateMany({ where: { id }, data: datos });
      const [antes, despues] = [cuandoEvento(anterior), cuandoEvento(datos)];
      if (count && antes !== despues) {
        await registrarActividad(tx, {
          accion: "CAMBIO",
          entidad: "EVENTO",
          entidadId: id,
          enlace: "/calendario",
          resumen: `Movió la cita «${anterior.titulo}» al ${despues}`,
          cambios: [{ campo: "Fecha", antes, despues }],
        });
      }
      return count > 0;
    }));
  if (!movido) return { success: false as const, error: "Este evento ya no existe." };
  return { success: true as const };
}

/** Directors delete any event; advisors only the ones they created. */
export async function eliminarEvento(id: string, ub: UbicacionEnviada) {
  const ctx = await getContextoEscritura(ub);
  if (!ctx.ok) return ctx.fallo;
  const { db, usuario, esDirector } = ctx;
  const evento = await db.evento.findUnique({ where: { id }, select: { creadoPorId: true, titulo: true } });
  if (!evento) return { success: false as const, error: "Este evento ya no existe." };
  if (!esDirector && evento.creadoPorId !== usuario.id) return SIN_PERMISO;
  await db.$transaction(async (tx) => {
    const { count } = await tx.evento.deleteMany({ where: { id } });
    if (count) {
      await registrarActividad(tx, {
        accion: "BAJA",
        entidad: "EVENTO",
        entidadId: id,
        resumen: `Borró la cita «${evento.titulo}»`,
      });
    }
  });
  return { success: true as const };
}

/** Name and current follow-up of a client or property, for the activity log. */
async function seguimientoActual(db: DbOficina, de: "cliente" | "inmueble", id: string) {
  if (de === "inmueble") {
    const i = await db.inmueble.findUnique({ where: { id }, select: { referencia: true, fechaProximoContacto: true } });
    return i && { nombre: i.referencia, fecha: i.fechaProximoContacto };
  }
  const c = await db.cliente.findUnique({
    where: { id },
    select: { nombre: true, apellidos: true, fechaProximoContacto: true },
  });
  return c && { nombre: `${c.nombre} ${c.apellidos}`, fecha: c.fechaProximoContacto };
}

/** Dragging a follow-up in the calendar reschedules the client's or the property's next contact. */
export async function moverProximoContacto(id: string, dia: string, de: "cliente" | "inmueble", ub: UbicacionEnviada) {
  const ctx = await getContextoEscritura(ub);
  if (!ctx.ok) return ctx.fallo;
  const { db } = ctx;
  if (!DIA_RE.test(dia)) {
    return { success: false as const, error: "Fecha no válida." };
  }
  const data = { fechaProximoContacto: aFecha(dia, true) };
  const anterior = await seguimientoActual(db, de, id);
  const lista = de === "inmueble" ? "/inmuebles" : "/clientes";

  const count = !anterior
    ? 0
    : await db.$transaction(async (tx) => {
        const { count } =
          de === "inmueble"
            ? await tx.inmueble.updateMany({ where: { id }, data })
            : await tx.cliente.updateMany({ where: { id }, data });
        const cambio = {
          campo: "Próximo contacto",
          antes: fechaCorta(anterior.fecha),
          despues: fechaCorta(data.fechaProximoContacto),
        };
        if (count && cambio.antes !== cambio.despues) {
          await registrarActividad(tx, {
            accion: "CAMBIO",
            entidad: de === "inmueble" ? "INMUEBLE" : "CLIENTE",
            entidadId: id,
            enlace: `${lista}/${id}`,
            resumen: frase.cambio(anterior.nombre, [{ ...cambio, articulo: "el" }]),
            cambios: [cambio],
          });
        }
        return count;
      });
  if (!count) {
    return { success: false as const, error: de === "inmueble" ? "Este inmueble ya no existe." : "Este cliente ya no existe." };
  }
  revalidatePath("/");
  revalidatePath(lista);
  revalidatePath(`${lista}/${id}`);
  return { success: true as const };
}
