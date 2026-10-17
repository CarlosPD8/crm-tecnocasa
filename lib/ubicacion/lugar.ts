import { distanciaAlBordeMetros, distanciaMetros, puntoEnPoligono, type Anillo } from "@/lib/ubicacion/geo";
import { ipEnRedes } from "@/lib/ubicacion/red";
import {
  formaZonaSchema,
  MENSAJES_UBICACION,
  PRECISION_APROXIMADA,
  PRECISION_MAXIMA,
  TOLERANCIA_MAXIMA,
  type MotivoUbicacion,
  type Posicion,
} from "@/lib/validations/ubicacion";

/**
 * Where an advisor is, for the location control: the office network, the
 * office (point + radius) or one of their zones (drawn contour). Pure, so it's
 * tested without a database; lib/ubicacion/servidor.ts feeds it.
 */

export const LUGAR_RED = "Red de la oficina";
export const LUGAR_OFICINA = "Oficina";

export type DatosOficina = {
  latitud: number | null;
  longitud: number | null;
  radioMetros: number;
  redes: string[];
};

export type ZonaLugar = { nombre: string; forma: unknown };

export type Lugar =
  | { ok: true; lugar: string; via: "red" | "oficina" | "zona"; metros?: number }
  | { ok: false; motivo: MotivoUbicacion; mensaje: string };

/** A zone's ring, or null if it has no (valid) contour. */
export function anilloDe(forma: unknown): Anillo | null {
  const r = formaZonaSchema.safeParse(forma);
  return r.success ? r.data.coordinates[0] : null;
}

function fallo(motivo: MotivoUbicacion, mensaje = MENSAJES_UBICACION[motivo]): Lugar {
  return { ok: false, motivo, mensaje };
}

export function resolverLugar({
  ip,
  pos,
  oficina,
  zonas,
}: {
  ip: string | null;
  pos: Posicion | null;
  oficina: DatosOficina;
  zonas: readonly ZonaLugar[];
}): Lugar {
  // The office network needs no GPS: it's how a wired desktop gets in.
  if (ipEnRedes(ip, oficina.redes)) return { ok: true, lugar: LUGAR_RED, via: "red" };
  if (!pos) return fallo("sin-ubicacion");
  if (pos.precision > PRECISION_APROXIMADA) return fallo("imprecisa");
  if (pos.precision > PRECISION_MAXIMA) return fallo("senal-debil");

  const margen = Math.min(pos.precision, TOLERANCIA_MAXIMA);
  const punto = { lat: pos.lat, lng: pos.lng };

  // The office first: it's usually inside a zone, and says more.
  if (oficina.latitud !== null && oficina.longitud !== null) {
    const metros = distanciaMetros(punto, { lat: oficina.latitud, lng: oficina.longitud });
    if (metros <= oficina.radioMetros + margen) {
      return { ok: true, lugar: LUGAR_OFICINA, via: "oficina", metros: Math.round(metros) };
    }
  }

  const dibujadas = zonas.flatMap((z) => {
    const anillo = anilloDe(z.forma);
    return anillo ? [{ nombre: z.nombre, anillo }] : [];
  });
  const zona = dibujadas.find(
    ({ anillo }) => puntoEnPoligono(punto, anillo) || distanciaAlBordeMetros(punto, anillo) <= margen
  );
  if (zona) return { ok: true, lugar: zona.nombre, via: "zona" };

  if (zonas.length === 0) {
    return fallo("fuera", "Estás fuera de la oficina y no tienes zona asignada: solo puedes registrar desde la oficina.");
  }
  if (dibujadas.length === 0) {
    return fallo(
      "fuera",
      "Estás fuera de la oficina, y tus zonas aún no están dibujadas en el mapa: de momento solo puedes registrar desde la oficina."
    );
  }
  return fallo("fuera");
}
