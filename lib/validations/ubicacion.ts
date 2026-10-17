import { z } from "zod";

/**
 * Location control (point 4): shapes shared by the browser and the server.
 * The browser only sends a position when saving or opening a form; the server
 * decides where that is (lib/ubicacion/lugar.ts) and keeps only the place name.
 */

/** Worse than this (metres) is a weak signal: wait or move to a window. */
export const PRECISION_MAXIMA = 150;
/** Worse than this is the phone's "approximate location" mode (km-level). */
export const PRECISION_APROXIMADA = 1000;
/** Margin at a zone border or the office radius, capped whatever the accuracy. */
export const TOLERANCIA_MAXIMA = 50;
/** A position older than this when it reaches the server isn't used. */
export const EDAD_MAXIMA_MS = 2 * 60 * 1000;

export const RADIO_OFICINA = { min: 50, max: 1000, porDefecto: 150 } as const;
/** Office networks kept at most (Wi-Fi, cable, IPv4 and IPv6…). */
export const MAX_REDES = 5;

export const posicionSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    /** Accuracy radius reported by the device, in metres. */
    precision: z.number().positive().max(100_000),
    /** Age of the fix when sent, measured in the browser (so clocks don't matter). */
    edadMs: z.number().min(0).max(EDAD_MAXIMA_MS),
  })
  .strict();

export type Posicion = z.infer<typeof posicionSchema>;

export const ubicacionEnviadaSchema = z.object({ pos: posicionSchema.nullable() });

declare const marca: unique symbol;

/**
 * Last argument of every write action. Only the location provider's `guardar`
 * builds one (components/ubicacion/ubicacion-provider.tsx), so a call site
 * that forgets to go through it doesn't compile.
 */
export type UbicacionEnviada = { pos: Posicion | null } & { readonly [marca]: true };

/** Why saving isn't allowed. The last three only happen in the browser. */
export type MotivoUbicacion =
  | "fuera"
  | "sin-ubicacion"
  | "senal-debil"
  | "imprecisa"
  | "denegada"
  | "no-disponible"
  | "tiempo-agotado";

/** What a write action returns when the location check fails. */
export type FalloUbicacion = { success: false; error: string; ubicacion: MotivoUbicacion };

/** Answer of `consultarLugar`: whether this user would be allowed to save now. */
export type EstadoLugar =
  | { control: false }
  | { control: true; ok: true; lugar: string; via: "red" | "oficina" | "zona" }
  | { control: true; ok: false; motivo: MotivoUbicacion; mensaje: string };

export const MENSAJES_UBICACION: Record<MotivoUbicacion, string> = {
  fuera: "Estás fuera de tu zona y de la oficina. Podrás registrarlo cuando vuelvas.",
  "sin-ubicacion": "Para guardar hace falta saber dónde estás. Permite la ubicación en el navegador.",
  "senal-debil": "Señal de ubicación débil, espera unos segundos o acércate a una ventana.",
  imprecisa:
    "Tu dispositivo solo da una ubicación aproximada. Activa la ubicación exacta para esta web.",
  denegada: "El navegador no deja ver tu ubicación, y sin ella no se puede guardar.",
  "no-disponible": "Este dispositivo no puede dar tu ubicación ahora. Activa la ubicación y vuelve a intentarlo.",
  "tiempo-agotado": "Señal de ubicación débil, espera unos segundos o acércate a una ventana.",
};

/** Six decimals: about 10 cm, more than any phone gives. */
const redondear = (n: number) => Math.round(n * 1e6) / 1e6;

const coordenada = z
  .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
  .transform(([lng, lat]): [number, number] => [redondear(lng), redondear(lat)]);

/** A zone's contour: a GeoJSON Polygon with a single closed ring. */
export const formaZonaSchema = z
  .object({
    type: z.literal("Polygon"),
    coordinates: z.tuple([z.array(coordenada).min(4, "Dibuja al menos tres puntos").max(501, "Demasiados puntos")]),
  })
  .strict()
  .refine(
    ({ coordinates: [anillo] }) => {
      const [primero, ultimo] = [anillo[0], anillo[anillo.length - 1]];
      return primero[0] === ultimo[0] && primero[1] === ultimo[1];
    },
    { message: "El contorno tiene que estar cerrado" }
  );

export type FormaZona = z.infer<typeof formaZonaSchema>;

export const ajustesOficinaSchema = z.object({
  latitud: z.number().min(-90).max(90).transform(redondear),
  longitud: z.number().min(-180).max(180).transform(redondear),
  radioMetros: z
    .number()
    .int()
    .min(RADIO_OFICINA.min, `Como mínimo ${RADIO_OFICINA.min} m`)
    .max(RADIO_OFICINA.max, `Como mucho ${RADIO_OFICINA.max} m`),
});

export type AjustesOficinaInput = z.input<typeof ajustesOficinaSchema>;
