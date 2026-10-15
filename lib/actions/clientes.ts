"use server";

import { revalidatePath } from "next/cache";
import { dbSinZonas, esUnicoViolado, getContexto, resolverAsesor, SIN_PERMISO, type Contexto } from "@/lib/db";
import { cambioCliente, frase, incluirCambiosCliente, registrarActividad } from "@/lib/actividad";
import {
  busquedaExacta,
  clienteSchema,
  normalizarDni,
  ordenarEtiquetas,
  type ClienteInput,
} from "@/lib/validations/cliente";

function toNullable(value: string | undefined) {
  return value && value.trim() !== "" ? value : null;
}

const NO_ENCONTRADO = { success: false as const, error: { _: ["Este cliente ya no existe."] } };

/**
 * Normalized DNI, or an error if another client of the office already has it,
 * also one this advisor doesn't see (the DNI is unique in the whole office).
 */
async function comprobarDni(
  ctx: Contexto,
  dni: string | undefined,
  excluirId?: string
): Promise<{ ok: true; dni: string | null } | { ok: false; mensaje: string }> {
  const normalizado = dni ? normalizarDni(dni) : null;
  if (!normalizado) return { ok: true, dni: null };
  const otro = await dbSinZonas(ctx).cliente.findFirst({
    where: { dni: normalizado, ...(excluirId ? { NOT: { id: excluirId } } : {}) },
    select: { id: true, nombre: true, apellidos: true },
  });
  if (!otro) return { ok: true, dni: normalizado };
  const nombre = `${otro.nombre} ${otro.apellidos}`;
  if (ctx.zonas && !(await ctx.db.cliente.count({ where: { id: otro.id } }))) {
    return {
      ok: false,
      mensaje: `Ya existe un cliente con este DNI (${nombre}), de otro asesor. Para trabajar con él, búscalo por su DNI al enlazarlo a tu piso.`,
    };
  }
  return { ok: false, mensaje: `Ya existe un cliente con este DNI: ${nombre}.` };
}

const DNI_REPETIDO = { success: false as const, error: { dni: ["Ya existe un cliente con este DNI."] } as Record<string, string[]> };

function datosCliente(data: ClienteInput, dni: string | null) {
  return {
    nombre: data.nombre,
    apellidos: data.apellidos,
    dni,
    telefono: toNullable(data.telefono),
    email: toNullable(data.email),
    direccion: toNullable(data.direccion),
    tipos: ordenarEtiquetas(data.tipos),
    notas: toNullable(data.notas),
    fechaProximoContacto: data.fechaProximoContacto ? new Date(data.fechaProximoContacto) : null,
  };
}

export async function crearCliente(data: ClienteInput) {
  const ctx = await getContexto();
  const { db } = ctx;
  const parsed = clienteSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  const dni = await comprobarDni(ctx, parsed.data.dni);
  if (!dni.ok) return { success: false as const, error: { dni: [dni.mensaje] } as Record<string, string[]> };
  const asesor = await resolverAsesor(ctx, parsed.data.asesorId);
  if (!asesor.ok) return { success: false as const, error: { asesorId: [asesor.error] } as Record<string, string[]> };

  let cliente;
  try {
    cliente = await db.$transaction(async (tx) => {
      const creado = await tx.cliente.create({
        data: { ...datosCliente(parsed.data, dni.dni), asesorId: asesor.asesorId },
      });
      await registrarActividad(tx, {
        accion: "ALTA",
        entidad: "CLIENTE",
        entidadId: creado.id,
        enlace: `/clientes/${creado.id}`,
        resumen: frase.altaCliente(`${creado.nombre} ${creado.apellidos}`),
      });
      return creado;
    });
  } catch (e) {
    if (esUnicoViolado(e)) return DNI_REPETIDO;
    throw e;
  }

  revalidatePath("/clientes");
  return { success: true as const, cliente };
}

export async function actualizarCliente(id: string, data: ClienteInput) {
  const ctx = await getContexto();
  const { db } = ctx;
  const parsed = clienteSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  const dni = await comprobarDni(ctx, parsed.data.dni, id);
  if (!dni.ok) return { success: false as const, error: { dni: [dni.mensaje] } as Record<string, string[]> };

  const actual = await db.cliente.findUnique({ where: { id }, include: incluirCambiosCliente });
  if (!actual) return NO_ENCONTRADO;
  const asesor = await resolverAsesor(ctx, parsed.data.asesorId, actual.asesorId);
  if (!asesor.ok) return { success: false as const, error: { asesorId: [asesor.error] } as Record<string, string[]> };

  let cliente;
  try {
    cliente = await db.$transaction(async (tx) => {
      const { count } = await tx.cliente.updateMany({
        where: { id },
        data: { ...datosCliente(parsed.data, dni.dni), asesorId: asesor.asesorId },
      });
      if (!count) return null;
      const nuevo = await tx.cliente.findUniqueOrThrow({ where: { id }, include: incluirCambiosCliente });
      const cambio = cambioCliente(actual, nuevo);
      if (cambio) await registrarActividad(tx, cambio);
      return nuevo;
    });
  } catch (e) {
    if (esUnicoViolado(e)) return DNI_REPETIDO;
    throw e;
  }
  if (!cliente) return NO_ENCONTRADO;

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { success: true as const, cliente };
}

export async function eliminarCliente(id: string) {
  const { db, esDirector } = await getContexto();
  if (!esDirector) return SIN_PERMISO;

  const cliente = await db.cliente.findUnique({
    where: { id },
    select: { nombre: true, apellidos: true, _count: { select: { operaciones: true, inmueblesEnPropiedad: true } } },
  });
  if (!cliente) return { success: false as const, error: "Este cliente ya no existe." };

  if (cliente._count.operaciones || cliente._count.inmueblesEnPropiedad) {
    return {
      success: false as const,
      error: "No se puede eliminar: tiene operaciones o inmuebles asociados.",
    };
  }

  await db.$transaction(async (tx) => {
    const { count } = await tx.cliente.deleteMany({ where: { id } });
    if (count) {
      await registrarActividad(tx, {
        accion: "BAJA",
        entidad: "CLIENTE",
        entidadId: id,
        resumen: `Borró a ${cliente.nombre} ${cliente.apellidos}`,
      });
    }
  });
  revalidatePath("/clientes");
  return { success: true as const };
}

/**
 * Clients for the pickers. An advisor only finds the clients they see, except
 * by exact DNI or phone: then also one of another zone (`deOtroAsesor`), so
 * they can link an existing person to their flat instead of duplicating them.
 */
export async function buscarClientes(query: string) {
  const ctx = await getContexto();

  const q = query.trim();
  if (!q) return [];

  const select = { id: true, nombre: true, apellidos: true, telefono: true } as const;
  const visibles = await ctx.db.cliente.findMany({
    where: {
      OR: [
        { nombre: { contains: q, mode: "insensitive" } },
        { apellidos: { contains: q, mode: "insensitive" } },
        { telefono: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { dni: { contains: normalizarDni(q), mode: "insensitive" } },
      ],
    },
    select,
    orderBy: { nombre: "asc" },
    take: 10,
  });
  const resultados = visibles.map((c) => ({ ...c, deOtroAsesor: false }));

  const exacta = ctx.zonas ? busquedaExacta(q) : null;
  if (!exacta) return resultados;
  const ajenos = await dbSinZonas(ctx).cliente.findMany({
    where: { AND: [exacta, { id: { notIn: visibles.map((c) => c.id) } }] },
    select,
    orderBy: { nombre: "asc" },
    take: 3,
  });
  return [...resultados, ...ajenos.map((c) => ({ ...c, deOtroAsesor: true }))];
}
