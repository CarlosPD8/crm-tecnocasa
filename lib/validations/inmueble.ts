import { z } from "zod";
import {
  TipoInmueble,
  TipoOperacion,
  EstadoInmueble,
  type Ocupacion,
} from "@/lib/generated/prisma/enums";

// The form can't send null through a segmented control, so «Sin datos» travels
// as its own value and becomes null in the database.
export const OCUPACION_FORM_VALUES = ["INQUILINOS", "PROPIETARIO", "VACIO", "SIN_DATOS"] as const;
export type OcupacionForm = (typeof OCUPACION_FORM_VALUES)[number];

export const inmuebleSchema = z.object({
  referencia: z.string().min(1, "La referencia es obligatoria"),
  direccion: z.string().min(1, "La dirección es obligatoria"),
  localidad: z.string().min(1, "La localidad es obligatoria"),
  tipoInmueble: z.nativeEnum(TipoInmueble),
  tipoOperacion: z.nativeEnum(TipoOperacion),
  precio: z
    .string()
    .min(1, "El precio es obligatorio")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Precio no válido"),
  metrosCuadrados: z.string().optional().or(z.literal("")),
  habitaciones: z.string().optional().or(z.literal("")),
  banos: z.string().optional().or(z.literal("")),
  descripcion: z.string().optional().or(z.literal("")),
  estado: z.nativeEnum(EstadoInmueble),
  propietarioId: z.string().optional().or(z.literal("")),
  bloqueId: z.string().optional().or(z.literal("")),
  escalera: z.string().optional().or(z.literal("")),
  planta: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || Number.isInteger(Number(v)), "La planta debe ser un número entero (0 = Bajo)"),
  puerta: z.string().optional().or(z.literal("")),
  ocupacion: z.enum(OCUPACION_FORM_VALUES),
  adquisicionPotencial: z.boolean(),
  fechaFinAlquiler: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha no válida"),
  // Only directors send it; "" = no advisor. Ignored for advisors (see resolverAsesor).
  asesorId: z.string().optional(),
});

export type InmuebleInput = z.infer<typeof inmuebleSchema>;

export const TIPO_INMUEBLE_LABELS: Record<TipoInmueble, string> = {
  PISO: "Piso",
  CASA: "Casa",
  CHALET: "Chalet",
  ATICO: "Ático",
  LOCAL: "Local",
  GARAJE: "Garaje",
  TERRENO: "Terreno",
  NAVE: "Nave",
  OFICINA: "Oficina",
};

export const TIPO_OPERACION_LABELS: Record<TipoOperacion, string> = {
  VENTA: "Venta",
  ALQUILER: "Alquiler",
};

export const ESTADO_INMUEBLE_LABELS: Record<EstadoInmueble, string> = {
  DISPONIBLE: "Disponible",
  RESERVADO: "Reservado",
  VENDIDO: "Vendido",
  ALQUILADO: "Alquilado",
};

export const OCUPACION_LABELS: Record<OcupacionForm, string> = {
  INQUILINOS: "Inquilinos",
  PROPIETARIO: "Propietario",
  VACIO: "Vacío",
  SIN_DATOS: "Sin datos",
};

export function ocupacionLabel(ocupacion: Ocupacion | null) {
  return OCUPACION_LABELS[ocupacion ?? "SIN_DATOS"];
}

export const ESCALERA_SUGERENCIAS = ["Izquierda", "Derecha", "A", "B", "C", "Única"];

export function formatPlanta(planta: number | null) {
  if (planta === null) return null;
  if (planta === 0) return "Bajo";
  if (planta < 0) return `Sótano ${-planta}`;
  return `${planta}º`;
}

/** «Esc. Izquierda · 3º B», «Bajo A», or null if there is nothing to show. */
export function formatUbicacion({
  escalera,
  planta,
  puerta,
}: {
  escalera: string | null;
  planta: number | null;
  puerta: string | null;
}) {
  const piso = [formatPlanta(planta), puerta].filter(Boolean).join(" ");
  const partes = [escalera ? `Esc. ${escalera}` : null, piso || null].filter(Boolean);
  return partes.length ? partes.join(" · ") : null;
}
