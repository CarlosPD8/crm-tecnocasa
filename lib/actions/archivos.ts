"use server";

import { revalidatePath } from "next/cache";
import { getContexto, SIN_PERMISO } from "@/lib/db";
import { frase, registrarActividad } from "@/lib/actividad";
import {
  subirArchivoStorage,
  eliminarArchivoStorage,
  getUrlPublicaFoto,
  rutaArchivo,
  BUCKET_DOCUMENTOS,
  BUCKET_FOTOS,
} from "@/lib/supabase/storage";
import type { CategoriaArchivo } from "@/lib/generated/prisma/enums";
import { MAX_BYTES_ARCHIVO } from "@/lib/comprimir-imagen";

/** Error message for an invalid upload, or null. The browser checks the same before sending. */
function errorArchivo(file: FormDataEntryValue | null, soloImagen = false) {
  if (!(file instanceof File) || file.size === 0) return "Selecciona un archivo.";
  if (file.size > MAX_BYTES_ARCHIVO) return "El archivo pesa más de 4 MB.";
  if (soloImagen && !file.type.startsWith("image/")) return "Sube una imagen (JPG, PNG o WebP).";
  return null;
}

export async function subirArchivoCliente(clienteId: string, formData: FormData) {
  const { db, oficinaId } = await getContexto();

  const file = formData.get("file");
  const errorFile = errorArchivo(file);
  if (errorFile || !(file instanceof File)) {
    return { success: false as const, error: errorFile ?? "Selecciona un archivo." };
  }
  const cliente = await db.cliente.findUnique({ where: { id: clienteId }, select: { nombre: true, apellidos: true } });
  if (!cliente) {
    return { success: false as const, error: "Este cliente ya no existe." };
  }

  const path = rutaArchivo(oficinaId, clienteId, file.name);

  try {
    await subirArchivoStorage(BUCKET_DOCUMENTOS, path, file);
  } catch {
    return { success: false as const, error: "No se pudo subir el archivo." };
  }

  try {
    await db.$transaction(async (tx) => {
      const archivo = await tx.archivo.create({
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
      await registrarActividad(tx, {
        accion: "ALTA",
        entidad: "ARCHIVO",
        entidadId: archivo.id,
        enlace: `/clientes/${clienteId}`,
        resumen: frase.archivo("DOCUMENTO", file.name, `${cliente.nombre} ${cliente.apellidos}`),
      });
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
  const { db, oficinaId } = await getContexto();

  const file = formData.get("file");
  const errorFile = errorArchivo(file, categoria === "FOTO");
  if (errorFile || !(file instanceof File)) {
    return { success: false as const, error: errorFile ?? "Selecciona un archivo." };
  }
  const inmueble = await db.inmueble.findUnique({ where: { id: inmuebleId }, select: { referencia: true } });
  if (!inmueble) {
    return { success: false as const, error: "Este inmueble ya no existe." };
  }

  const bucket = categoria === "FOTO" ? BUCKET_FOTOS : BUCKET_DOCUMENTOS;
  const path = rutaArchivo(oficinaId, inmuebleId, file.name);

  try {
    await subirArchivoStorage(bucket, path, file);
  } catch {
    return { success: false as const, error: "No se pudo subir el archivo." };
  }

  try {
    await db.$transaction(async (tx) => {
      const { _max } = await tx.archivo.aggregate({
        where: { inmuebleId, categoria },
        _max: { orden: true },
      });

      const archivo = await tx.archivo.create({
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
      await registrarActividad(tx, {
        accion: "ALTA",
        entidad: "ARCHIVO",
        entidadId: archivo.id,
        enlace: `/inmuebles/${inmuebleId}`,
        resumen: frase.archivo(categoria, file.name, inmueble.referencia),
      });
    });
  } catch {
    await eliminarArchivoStorage(bucket, path);
    return { success: false as const, error: "No se pudo registrar el archivo." };
  }

  revalidatePath(`/inmuebles/${inmuebleId}`);
  return { success: true as const };
}

/** Directors delete any file; advisors only the ones they uploaded. */
export async function eliminarArchivo(archivoId: string) {
  const { db, usuario, esDirector } = await getContexto();

  const archivo = await db.archivo.findUnique({
    where: { id: archivoId },
    include: {
      cliente: { select: { nombre: true, apellidos: true } },
      inmueble: { select: { referencia: true } },
    },
  });
  if (!archivo) return { success: false as const, error: "Este archivo ya no existe." };
  if (!esDirector && archivo.creadoPorId !== usuario.id) return SIN_PERMISO;

  await eliminarArchivoStorage(archivo.bucket, archivo.path);
  const de = archivo.inmueble?.referencia ?? (archivo.cliente ? `${archivo.cliente.nombre} ${archivo.cliente.apellidos}` : "");
  await db.$transaction(async (tx) => {
    const { count } = await tx.archivo.deleteMany({ where: { id: archivoId } });
    if (count) {
      await registrarActividad(tx, {
        accion: "BAJA",
        entidad: "ARCHIVO",
        entidadId: archivoId,
        enlace: archivo.inmuebleId ? `/inmuebles/${archivo.inmuebleId}` : `/clientes/${archivo.clienteId}`,
        resumen:
          archivo.categoria === "FOTO"
            ? `Borró una foto de ${de}`
            : `Borró el documento «${archivo.nombreOriginal}» de ${de}`,
      });
    }
  });

  if (archivo.clienteId) revalidatePath(`/clientes/${archivo.clienteId}`);
  if (archivo.inmuebleId) revalidatePath(`/inmuebles/${archivo.inmuebleId}`);
  return { success: true as const };
}

/** Not logged: reordering photos tells a director nothing about the work done. */
export async function moverFoto(archivoId: string, direccion: "arriba" | "abajo") {
  const { db } = await getContexto();

  const archivo = await db.archivo.findUnique({
    where: { id: archivoId },
  });

  if (!archivo?.inmuebleId || archivo.categoria !== "FOTO") {
    return { success: false as const, error: "No es una foto de inmueble." };
  }

  const vecino = await db.archivo.findFirst({
    where: {
      inmuebleId: archivo.inmuebleId,
      categoria: "FOTO",
      orden: direccion === "arriba" ? { lt: archivo.orden } : { gt: archivo.orden },
    },
    orderBy: { orden: direccion === "arriba" ? "desc" : "asc" },
  });

  if (!vecino) return { success: true as const };

  await db.$transaction([
    db.archivo.update({ where: { id: archivo.id }, data: { orden: vecino.orden } }),
    db.archivo.update({ where: { id: vecino.id }, data: { orden: archivo.orden } }),
  ]);

  revalidatePath(`/inmuebles/${archivo.inmuebleId}`);
  return { success: true as const };
}
