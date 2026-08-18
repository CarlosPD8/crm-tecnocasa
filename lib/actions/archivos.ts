"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import {
  subirArchivoStorage,
  eliminarArchivoStorage,
  getUrlPublicaFoto,
  BUCKET_DOCUMENTOS,
  BUCKET_FOTOS,
} from "@/lib/supabase/storage";
import type { CategoriaArchivo } from "@/lib/generated/prisma/enums";

export async function subirArchivoCliente(clienteId: string, formData: FormData) {
  await requireSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false as const, error: "Selecciona un archivo." };
  }

  const path = `${clienteId}/${crypto.randomUUID()}-${file.name}`;

  try {
    await subirArchivoStorage(BUCKET_DOCUMENTOS, path, file);
  } catch {
    return { success: false as const, error: "No se pudo subir el archivo." };
  }

  try {
    await prisma.archivo.create({
      data: {
        categoria: "DOCUMENTO",
        clienteId,
        bucket: BUCKET_DOCUMENTOS,
        path,
        nombreOriginal: file.name,
        tamanioBytes: file.size,
        mimeType: file.type || "application/octet-stream",
      },
    });
  } catch {
    await eliminarArchivoStorage(BUCKET_DOCUMENTOS, path);
    return { success: false as const, error: "No se pudo registrar el archivo." };
  }

  revalidatePath(`/clientes/${clienteId}`);
  return { success: true as const };
}

export async function subirArchivoInmueble(
  inmuebleId: string,
  categoria: CategoriaArchivo,
  formData: FormData
) {
  await requireSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false as const, error: "Selecciona un archivo." };
  }

  const bucket = categoria === "FOTO" ? BUCKET_FOTOS : BUCKET_DOCUMENTOS;
  const path = `${inmuebleId}/${crypto.randomUUID()}-${file.name}`;

  try {
    await subirArchivoStorage(bucket, path, file);
  } catch {
    return { success: false as const, error: "No se pudo subir el archivo." };
  }

  try {
    const { _max } = await prisma.archivo.aggregate({
      where: { inmuebleId, categoria },
      _max: { orden: true },
    });

    await prisma.archivo.create({
      data: {
        categoria,
        inmuebleId,
        bucket,
        path,
        url: categoria === "FOTO" ? getUrlPublicaFoto(path) : null,
        nombreOriginal: file.name,
        tamanioBytes: file.size,
        mimeType: file.type || "application/octet-stream",
        orden: (_max.orden ?? -1) + 1,
      },
    });
  } catch {
    await eliminarArchivoStorage(bucket, path);
    return { success: false as const, error: "No se pudo registrar el archivo." };
  }

  revalidatePath(`/inmuebles/${inmuebleId}`);
  return { success: true as const };
}

export async function eliminarArchivo(archivoId: string) {
  await requireSession();

  const archivo = await prisma.archivo.findUniqueOrThrow({
    where: { id: archivoId },
  });

  await eliminarArchivoStorage(archivo.bucket, archivo.path);
  await prisma.archivo.delete({ where: { id: archivoId } });

  if (archivo.clienteId) revalidatePath(`/clientes/${archivo.clienteId}`);
  if (archivo.inmuebleId) revalidatePath(`/inmuebles/${archivo.inmuebleId}`);
  return { success: true as const };
}

export async function moverFoto(archivoId: string, direccion: "arriba" | "abajo") {
  await requireSession();

  const archivo = await prisma.archivo.findUniqueOrThrow({
    where: { id: archivoId },
  });

  if (!archivo.inmuebleId || archivo.categoria !== "FOTO") {
    return { success: false as const, error: "No es una foto de inmueble." };
  }

  const vecino = await prisma.archivo.findFirst({
    where: {
      inmuebleId: archivo.inmuebleId,
      categoria: "FOTO",
      orden: direccion === "arriba" ? { lt: archivo.orden } : { gt: archivo.orden },
    },
    orderBy: { orden: direccion === "arriba" ? "desc" : "asc" },
  });

  if (!vecino) return { success: true as const };

  await prisma.$transaction([
    prisma.archivo.update({ where: { id: archivo.id }, data: { orden: vecino.orden } }),
    prisma.archivo.update({ where: { id: vecino.id }, data: { orden: archivo.orden } }),
  ]);

  revalidatePath(`/inmuebles/${archivo.inmuebleId}`);
  return { success: true as const };
}
