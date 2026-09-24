import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";

// Storage has no policies for the public roles: every upload, delete and signed
// URL goes through the server with the service role, after the caller has
// checked that the file (or the client/property it belongs to) is in the
// user's office.

export const BUCKET_FOTOS = "inmuebles-fotos";
export const BUCKET_DOCUMENTOS = "documentos";

/**
 * Storage key for an uploaded file, under the office's folder. Supabase Storage
 * rejects keys with accents and other non-ASCII characters («PÉREZ.pdf» → 400),
 * so the name is reduced to safe ASCII; the original name is kept in the
 * database for display.
 */
export function rutaArchivo(oficinaId: string, carpeta: string, nombre: string) {
  const punto = nombre.lastIndexOf(".");
  const limpiar = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "");
  const base = limpiar(punto > 0 ? nombre.slice(0, punto) : nombre).slice(0, 80) || "archivo";
  const extension = punto > 0 ? limpiar(nombre.slice(punto + 1)).slice(0, 10).toLowerCase() : "";
  return `${oficinaId}/${carpeta}/${crypto.randomUUID()}-${base}${extension ? `.${extension}` : ""}`;
}

export async function subirArchivoStorage(
  bucket: string,
  path: string,
  file: File
) {
  const { error } = await crearClienteAdmin().storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;
}

export async function eliminarArchivoStorage(bucket: string, path: string) {
  const { error } = await crearClienteAdmin().storage.from(bucket).remove([path]);
  if (error) throw error;
}

export function getUrlPublicaFoto(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_FOTOS}/${path}`;
}

/** Only for the path of an `Archivo` already loaded through the office client. */
export async function getUrlFirmadaDocumento(path: string, expiresIn = 300) {
  const { data, error } = await crearClienteAdmin()
    .storage.from(BUCKET_DOCUMENTOS)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}
