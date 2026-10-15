import { z } from "zod";

/**
 * Fixed palette for zones: muted tones that sit well on the cream background
 * and stay apart from the status colors. The key is what gets stored.
 */
export const COLORES_ZONA = {
  verde: { label: "Verde", valor: "oklch(0.56 0.1 160)" },
  azul: { label: "Azul", valor: "oklch(0.55 0.1 245)" },
  turquesa: { label: "Turquesa", valor: "oklch(0.62 0.09 200)" },
  oliva: { label: "Oliva", valor: "oklch(0.6 0.1 120)" },
  ocre: { label: "Ocre", valor: "oklch(0.7 0.12 80)" },
  teja: { label: "Teja", valor: "oklch(0.6 0.13 40)" },
  rosa: { label: "Rosa", valor: "oklch(0.63 0.12 0)" },
  violeta: { label: "Violeta", valor: "oklch(0.55 0.1 300)" },
  gris: { label: "Gris", valor: "oklch(0.6 0.015 80)" },
} as const;

export type ColorZona = keyof typeof COLORES_ZONA;

const CLAVES_COLOR = Object.keys(COLORES_ZONA) as [ColorZona, ...ColorZona[]];

/** The palette entry of a stored color (gray for an unknown one). */
export function colorZona(color: string) {
  return Object.hasOwn(COLORES_ZONA, color) ? COLORES_ZONA[color as ColorZona] : COLORES_ZONA.gris;
}

export const zonaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(60, "Como mucho 60 caracteres"),
  color: z.enum(CLAVES_COLOR, { message: "Elige un color" }),
  notas: z.string().optional().or(z.literal("")),
  asesorIds: z.array(z.string()).max(200),
});

export type ZonaInput = z.infer<typeof zonaSchema>;
