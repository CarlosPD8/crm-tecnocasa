"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { clienteSchema, type ClienteInput } from "@/lib/validations/cliente";

function toNullable(value: string | undefined) {
  return value && value.trim() !== "" ? value : null;
}

export async function crearCliente(data: ClienteInput) {
  await requireSession();
  const parsed = clienteSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const cliente = await prisma.cliente.create({
    data: {
      nombre: parsed.data.nombre,
      apellidos: parsed.data.apellidos,
      telefono: toNullable(parsed.data.telefono),
      email: toNullable(parsed.data.email),
      direccion: toNullable(parsed.data.direccion),
      tipoCliente: parsed.data.tipoCliente,
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

  const cliente = await prisma.cliente.update({
    where: { id },
    data: {
      nombre: parsed.data.nombre,
      apellidos: parsed.data.apellidos,
      telefono: toNullable(parsed.data.telefono),
      email: toNullable(parsed.data.email),
      direccion: toNullable(parsed.data.direccion),
      tipoCliente: parsed.data.tipoCliente,
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
      ],
    },
    select: { id: true, nombre: true, apellidos: true, telefono: true },
    orderBy: { nombre: "asc" },
    take: 10,
  });
}
