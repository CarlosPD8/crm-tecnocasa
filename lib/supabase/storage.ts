import { createClient } from "@/lib/supabase/server";

export const BUCKET_FOTOS = "inmuebles-fotos";
export const BUCKET_DOCUMENTOS = "documentos";

export async function subirArchivoStorage(
  bucket: string,
  path: string,
  file: File
) {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;
}

export async function eliminarArchivoStorage(bucket: string, path: string) {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

export function getUrlPublicaFoto(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_FOTOS}/${path}`;
}

export async function getUrlFirmadaDocumento(path: string, expiresIn = 300) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}
