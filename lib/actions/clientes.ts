"use server";

import { revalidatePath } from "next/cache";
import { getContexto, resolverAsesor, SIN_PERMISO, type DbOficina } from "@/lib/db";
import { clienteSchema, normalizarDni, ordenarEtiquetas, type ClienteInput } from "@/lib/validations/cliente";

function toNullable(value: string | undefined) {
  return value && value.trim() !== "" ? value : null;
}

const NO_ENCONTRADO = { success: false as const, error: { _: ["Este cliente ya no existe."] } };

/** Normalized DNI, or an error if another client of the office already has it. */
async function comprobarDni(
  db: DbOficina,
  dni: string | undefined,
  excluirId?: string
): Promise<{ ok: true; dni: string | null } | { ok: false; mensaje: string }> {
  const normalizado = dni ? normalizarDni(dni) : null;
  if (!normalizado) return { ok: true, dni: null };
  const otro = await db.cliente.findFirst({
    where: { dni: normalizado, ...(excluirId ? { NOT: { id: excluirId } } : {}) },
    select: { nombre: true, apellidos: true },
  });
  if (otro) {
    return { ok: false, mensaje: `Ya existe un cliente con este DNI: ${otro.nombre} ${otro.apellidos}.` };
  }
  return { ok: true, dni: normalizado };
}

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
  const dni = await comprobarDni(db, parsed.data.dni);
  if (!dni.ok) return { success: false as const, error: { dni: [dni.mensaje] } };
  const asesor = await resolverAsesor(ctx, parsed.data.asesorId);
  if (!asesor.ok) return { success: false as const, error: { asesorId: [asesor.error] } };

  const cliente = await db.cliente.create({
    data: { ...datosCliente(parsed.data, dni.dni), asesorId: asesor.asesorId },
  });

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
  const dni = await comprobarDni(db, parsed.data.dni, id);
  if (!dni.ok) return { success: false as const, error: { dni: [dni.mensaje] } };

  const actual = await db.cliente.findUnique({ where: { id }, select: { asesorId: true } });
  if (!actual) return NO_ENCONTRADO;
  const asesor = await resolverAsesor(ctx, parsed.data.asesorId, actual.asesorId);
  if (!asesor.ok) return { success: false as const, error: { asesorId: [asesor.error] } };

  const { count } = await db.cliente.updateMany({
    where: { id },
    data: { ...datosCliente(parsed.data, dni.dni), asesorId: asesor.asesorId },
  });
  if (!count) return NO_ENCONTRADO;
  const cliente = await db.cliente.findUniqueOrThrow({ where: { id } });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { success: true as const, cliente };
}

export async function eliminarCliente(id: string) {
  const { db, esDirector } = await getContexto();
  if (!esDirector) return SIN_PERMISO;

  const cliente = await db.cliente.findUnique({
    where: { id },
    select: { _count: { select: { operaciones: true, inmueblesEnPropiedad: true } } },
  });
  if (!cliente) return { success: false as const, error: "Este cliente ya no existe." };

  if (cliente._count.operaciones || cliente._count.inmueblesEnPropiedad) {
    return {
      success: false as const,
      error: "No se puede eliminar: tiene operaciones o inmuebles asociados.",
    };
  }

  await db.cliente.deleteMany({ where: { id } });
  revalidatePath("/clientes");
  return { success: true as const };
}

export async function buscarClientes(query: string) {
  const { db } = await getContexto();

  const q = query.trim();
  if (!q) return [];

  return db.cliente.findMany({
    where: {
      OR: [
        { nombre: { contains: q, mode: "insensitive" } },
        { apellidos: { contains: q, mode: "insensitive" } },
        { telefono: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { dni: { contains: normalizarDni(q), mode: "insensitive" } },
      ],
    },
    select: { id: true, nombre: true, apellidos: true, telefono: true },
    orderBy: { nombre: "asc" },
    take: 10,
  });
}
