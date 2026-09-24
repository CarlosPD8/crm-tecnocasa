/**
 * Upload limit per file. Uploads go through a Server Action and Vercel rejects
 * request bodies over 4.5 MB, so `serverActions.bodySizeLimit` in
 * next.config.ts is 4.5mb and files are capped a little below it.
 */
export const MAX_BYTES_ARCHIVO = 4 * 1024 * 1024;

// Long side in pixels: enough for a full-screen photo and to read a
// photographed document. A phone photo (3–5 MB) ends up around 300–600 KB.
const LADO_MAX = 2048;
const CALIDAD = 0.82;
// Smaller images are uploaded as they are.
const SIN_COMPRIMIR_HASTA = 300 * 1024;

const COMPRIMIBLES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/bmp"]);

/**
 * Resizes and re-encodes a raster image as JPEG in the browser before it is
 * uploaded. Anything that is not such an image (PDF, GIF, SVG…) or that the
 * browser cannot decode comes back unchanged.
 */
export async function comprimirImagen(file: File): Promise<File> {
  if (!COMPRIMIBLES.has(file.type) || file.size <= SIN_COMPRIMIR_HASTA) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // JPEG has no transparency: paint it white instead of black.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", CALIDAD)
    );
    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}

export function formatearMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
