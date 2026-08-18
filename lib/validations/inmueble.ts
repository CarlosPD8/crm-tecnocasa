import { z } from "zod";
import { TipoInmueble, TipoOperacion, EstadoInmueble } from "@/lib/generated/prisma/enums";

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
