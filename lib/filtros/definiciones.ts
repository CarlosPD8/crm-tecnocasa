import type { DefinicionFiltros } from "@/lib/filtros/tipos";
import { TIPO_CLIENTE_LABELS } from "@/lib/validations/cliente";
import {
  ESTADO_INMUEBLE_LABELS,
  OCUPACION_LABELS,
  TIPO_INMUEBLE_LABELS,
  TIPO_OPERACION_LABELS,
} from "@/lib/validations/inmueble";

export const FILTROS_CLIENTES = {
  campos: [
    { clave: "tipo", etiqueta: "Etiquetas", grupo: "Perfil", tipo: "multi", opciones: TIPO_CLIENTE_LABELS },
    { clave: "interes", etiqueta: "Interesado en", grupo: "Perfil", tipo: "multi", opciones: TIPO_OPERACION_LABELS },
    { clave: "propietario", etiqueta: "Tiene inmuebles en propiedad", grupo: "Perfil", tipo: "bool" },
    { clave: "operaciones", etiqueta: "Ha cerrado operaciones", grupo: "Perfil", tipo: "bool" },
    {
      clave: "proximo",
      etiqueta: "Próximo contacto",
      grupo: "Seguimiento",
      tipo: "fecha",
      presets: ["vencido", "hoy", "proximos7", "proximos30", "sin"],
    },
    {
      clave: "ultimo",
      etiqueta: "Último contacto",
      grupo: "Seguimiento",
      tipo: "fecha",
      presets: ["ultimos7", "ultimos30", "mas30", "mas90", "sin"],
    },
    { clave: "citas", etiqueta: "Tiene citas en la agenda", grupo: "Seguimiento", tipo: "bool" },
    { clave: "telefono", etiqueta: "Teléfono", grupo: "Datos de contacto", tipo: "bool", si: "Con teléfono", no: "Sin teléfono" },
    { clave: "email", etiqueta: "Email", grupo: "Datos de contacto", tipo: "bool", si: "Con email", no: "Sin email" },
    { clave: "dni", etiqueta: "DNI / NIE", grupo: "Datos de contacto", tipo: "bool", si: "Con DNI", no: "Sin DNI" },
    { clave: "direccion", etiqueta: "Dirección contiene", grupo: "Datos de contacto", tipo: "texto", placeholder: "Calle, barrio…" },
    { clave: "notas", etiqueta: "Notas contienen", grupo: "Otros", tipo: "texto", placeholder: "Palabra en las notas" },
    { clave: "alta", etiqueta: "Fecha de alta", grupo: "Otros", tipo: "fecha", presets: ["ultimos7", "ultimos30", "esteMes"] },
  ],
  orden: {
    recientes: "Alta más reciente",
    antiguos: "Alta más antigua",
    nombre: "Nombre (A–Z)",
    proximo: "Próximo contacto más cercano",
    ultimo: "Más tiempo sin contacto",
  },
} as const satisfies DefinicionFiltros;

export const FILTROS_INMUEBLES = {
  campos: [
    { clave: "tipoOperacion", etiqueta: "Operación", grupo: "Comercialización", tipo: "multi", opciones: TIPO_OPERACION_LABELS },
    { clave: "estado", etiqueta: "Estado", grupo: "Comercialización", tipo: "multi", opciones: ESTADO_INMUEBLE_LABELS },
    { clave: "precio", etiqueta: "Precio", grupo: "Comercialización", tipo: "rango", sufijo: "€" },
    { clave: "tipoInmueble", etiqueta: "Tipo de inmueble", grupo: "Características", tipo: "multi", opciones: TIPO_INMUEBLE_LABELS },
    { clave: "metros", etiqueta: "Superficie", grupo: "Características", tipo: "rango", sufijo: "m²", entero: true },
    { clave: "habitaciones", etiqueta: "Habitaciones", grupo: "Características", tipo: "rango", entero: true },
    { clave: "banos", etiqueta: "Baños", grupo: "Características", tipo: "rango", entero: true },
    { clave: "descripcion", etiqueta: "Descripción contiene", grupo: "Características", tipo: "texto", placeholder: "Terraza, ascensor, garaje…" },
    { clave: "localidad", etiqueta: "Localidad", grupo: "Ubicación", tipo: "multi", opciones: "dinamico" },
    { clave: "bloque", etiqueta: "Bloque (calle o nombre)", grupo: "Ubicación", tipo: "texto", placeholder: "C/ Estrellas…" },
    { clave: "enBloque", etiqueta: "Asignado a un bloque", grupo: "Ubicación", tipo: "bool" },
    { clave: "escalera", etiqueta: "Escalera", grupo: "Ubicación", tipo: "texto", placeholder: "Izquierda, A…" },
    { clave: "planta", etiqueta: "Planta", grupo: "Ubicación", tipo: "rango", entero: true },
    { clave: "ocupacion", etiqueta: "Ocupación", grupo: "Situación", tipo: "multi", opciones: OCUPACION_LABELS },
    { clave: "potencial", etiqueta: "Adquisición potencial", grupo: "Situación", tipo: "bool" },
    { clave: "propietario", etiqueta: "Con propietario asignado", grupo: "Situación", tipo: "bool" },
    {
      clave: "ultimo",
      etiqueta: "Último contacto",
      grupo: "Seguimiento",
      tipo: "fecha",
      presets: ["ultimos7", "ultimos30", "mas30", "mas90", "sin"],
    },
    { clave: "interesados", etiqueta: "Tiene interesados", grupo: "Seguimiento", tipo: "bool" },
    { clave: "citas", etiqueta: "Tiene citas en la agenda", grupo: "Seguimiento", tipo: "bool" },
    { clave: "fotos", etiqueta: "Tiene fotos", grupo: "Otros", tipo: "bool" },
    { clave: "operaciones", etiqueta: "Con operaciones cerradas", grupo: "Otros", tipo: "bool" },
    { clave: "alta", etiqueta: "Fecha de alta", grupo: "Otros", tipo: "fecha", presets: ["ultimos7", "ultimos30", "esteMes"] },
  ],
  orden: {
    recientes: "Alta más reciente",
    precioAsc: "Precio más bajo",
    precioDesc: "Precio más alto",
    metros: "Más superficie",
    referencia: "Referencia",
    ultimo: "Más tiempo sin contacto",
    ubicacion: "Bloque, escalera y planta",
  },
} as const satisfies DefinicionFiltros;

export const FILTROS_BLOQUES = {
  campos: [
    { clave: "localidad", etiqueta: "Localidad", grupo: "Ubicación", tipo: "multi", opciones: "dinamico" },
    { clave: "cp", etiqueta: "Código postal", grupo: "Ubicación", tipo: "texto", placeholder: "18002" },
    { clave: "ocupacion", etiqueta: "Con algún piso…", grupo: "Pisos", tipo: "multi", opciones: OCUPACION_LABELS },
    { clave: "potenciales", etiqueta: "Con adquisiciones potenciales", grupo: "Pisos", tipo: "bool" },
    { clave: "disponibles", etiqueta: "Con pisos disponibles", grupo: "Pisos", tipo: "bool" },
    { clave: "conPisos", etiqueta: "Con pisos asignados", grupo: "Pisos", tipo: "bool" },
    { clave: "alta", etiqueta: "Fecha de alta", grupo: "Otros", tipo: "fecha", presets: ["ultimos7", "ultimos30", "esteMes"] },
  ],
  orden: {
    calle: "Calle y número",
    localidad: "Localidad",
    recientes: "Alta más reciente",
  },
} as const satisfies DefinicionFiltros;

export const DEFINICIONES = {
  clientes: FILTROS_CLIENTES,
  inmuebles: FILTROS_INMUEBLES,
  bloques: FILTROS_BLOQUES,
} satisfies Record<string, DefinicionFiltros>;

export type EntidadFiltrable = keyof typeof DEFINICIONES;

/** Search params that carry filters (plus sort), to keep them across pagination. */
export function paramsDeFiltros(entidad: EntidadFiltrable, sp: Record<string, string | undefined>) {
  const claves = [...DEFINICIONES[entidad].campos.map((c) => c.clave), "orden", "q"];
  return Object.fromEntries(claves.filter((k) => sp[k]).map((k) => [k, sp[k]]));
}

/** How many filters are active (search excluded). */
export function contarFiltros(entidad: EntidadFiltrable, sp: Record<string, string | undefined>) {
  return DEFINICIONES[entidad].campos.filter((c) => sp[c.clave]).length;
}
