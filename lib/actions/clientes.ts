"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { clienteSchema, normalizarDni, ordenarEtiquetas, type ClienteInput } from "@/lib/validations/cliente";

function toNullable(value: string | undefined) {
  return value && value.trim() !== "" ? value : null;
}

/**
 * Tags in display order. The legacy single-type column mirrors the first tag
 * until the deployed version stops reading it.
 */
function etiquetas(tipos: ClienteInput["tipos"]) {
  const ordenadas = ordenarEtiquetas(tipos);
  return { tipos: ordenadas, tipoCliente: ordenadas[0] };
}

/** Normalized DNI, or an error if another client already has it. */
async function comprobarDni(
  dni: string | undefined,
  excluirId?: string
): Promise<{ ok: true; dni: string | null } | { ok: false; mensaje: string }> {
  const normalizado = dni ? normalizarDni(dni) : null;
  if (!normalizado) return { ok: true, dni: null };
  const otro = await prisma.cliente.findFirst({
    where: { dni: normalizado, ...(excluirId ? { NOT: { id: excluirId } } : {}) },
    select: { nombre: true, apellidos: true },
  });
  if (otro) {
    return { ok: false, mensaje: `Ya existe un cliente con este DNI: ${otro.nombre} ${otro.apellidos}.` };
  }
  return { ok: true, dni: normalizado };
}

export async function crearCliente(data: ClienteInput) {
  await requireSession();
  const parsed = clienteSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  const dni = await comprobarDni(parsed.data.dni);
  if (!dni.ok) return { success: false as const, error: { dni: [dni.mensaje] } };

  const cliente = await prisma.cliente.create({
    data: {
      nombre: parsed.data.nombre,
      apellidos: parsed.data.apellidos,
      dni: dni.dni,
      telefono: toNullable(parsed.data.telefono),
      email: toNullable(parsed.data.email),
      direccion: toNullable(parsed.data.direccion),
      ...etiquetas(parsed.data.tipos),
      notas: toNullable(parsed.data.notas),
      fechaProximoContacto: parsed.data.fechaProximoContacto
        ? new Date(parsed.data.fechaProximoContacto)
        : null,
    },
  });

  revalidatePath("/clientes");
  return { success: true as const, cliente };
}

export async function actualizarCliente(id: string, data: ClienteInput) {
  await requireSession();
  const parsed = clienteSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  const dni = await comprobarDni(parsed.data.dni, id);
  if (!dni.ok) return { success: false as const, error: { dni: [dni.mensaje] } };

  const cliente = await prisma.cliente.update({
    where: { id },
    data: {
      nombre: parsed.data.nombre,
      apellidos: parsed.data.apellidos,
      dni: dni.dni,
      telefono: toNullable(parsed.data.telefono),
      email: toNullable(parsed.data.email),
      direccion: toNullable(parsed.data.direccion),
      ...etiquetas(parsed.data.tipos),
      notas: toNullable(parsed.data.notas),
      fechaProximoContacto: parsed.data.fechaProximoContacto
        ? new Date(parsed.data.fechaProximoContacto)
        : null,
    },
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { success: true as const, cliente };
}

export async function eliminarCliente(id: string) {
  await requireSession();

  const bloqueado = await prisma.cliente.findFirst({
    where: {
      id,
      OR: [
        { operaciones: { some: {} } },
        { inmueblesEnPropiedad: { some: {} } },
      ],
    },
    select: { id: true },
  });

  if (bloqueado) {
    return {
      success: false as const,
      error: "No se puede eliminar: tiene operaciones o inmuebles asociados.",
    };
  }

  await prisma.cliente.delete({ where: { id } });
  revalidatePath("/clientes");
  return { success: true as const };
}

export async function buscarClientes(query: string) {
  await requireSession();

  const q = query.trim();
  if (!q) return [];

  return prisma.cliente.findMany({
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
