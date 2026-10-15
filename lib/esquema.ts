import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Schema facts shared by the office scope (lib/ambito-oficina.ts) and the zone
 * visibility (lib/zonas.ts): every relation field and the error both throw.
 * Kept free of Next.js imports so scripts and tests can use it.
 */

export class ErrorAmbito extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorAmbito";
  }
}

// "Modelo" = required to-one, "Modelo?" = optional to-one, "Modelo[]" = list.
type TipoRelacion = `${Prisma.ModelName}${"" | "?" | "[]"}`;
type Relaciones<Include> = Record<Exclude<keyof Include, "_count">, TipoRelacion>;

// Relation fields per model. Typed as exhaustive records: adding a relation to
// the schema without listing it here is a type error (and tests/zonas-visibilidad
// checks the targets against prisma/schema.prisma).
export const RELACIONES = {
  Oficina: {
    usuarios: "Usuario[]", clientes: "Cliente[]", inmuebles: "Inmueble[]", bloques: "Bloque[]",
    contactos: "Contacto[]", eventos: "Evento[]", intereses: "Interes[]", operaciones: "Operacion[]",
    archivos: "Archivo[]", actividades: "Actividad[]", zonas: "Zona[]", zonaAsesores: "ZonaAsesor[]",
  } satisfies Relaciones<Prisma.OficinaInclude>,
  Usuario: {
    oficina: "Oficina", clientesCreados: "Cliente[]", clientesAsignados: "Cliente[]",
    inmueblesCreados: "Inmueble[]", inmueblesAsignados: "Inmueble[]", bloquesCreados: "Bloque[]",
    contactosCreados: "Contacto[]", eventosCreados: "Evento[]", operacionesCreadas: "Operacion[]",
    archivosCreados: "Archivo[]", interesesCreados: "Interes[]", actividades: "Actividad[]",
    zonasCreadas: "Zona[]", zonasAsignadas: "ZonaAsesor[]",
  } satisfies Relaciones<Prisma.UsuarioInclude>,
  Evento: {
    oficina: "Oficina", cliente: "Cliente?", inmueble: "Inmueble?", creadoPor: "Usuario?",
  } satisfies Relaciones<Prisma.EventoInclude>,
  Bloque: {
    oficina: "Oficina", zona: "Zona", creadoPor: "Usuario?", inmuebles: "Inmueble[]",
  } satisfies Relaciones<Prisma.BloqueInclude>,
  Cliente: {
    oficina: "Oficina", asesor: "Usuario?", creadoPor: "Usuario?", contactos: "Contacto[]",
    archivos: "Archivo[]", intereses: "Interes[]", operaciones: "Operacion[]",
    inmueblesEnPropiedad: "Inmueble[]", eventos: "Evento[]",
  } satisfies Relaciones<Prisma.ClienteInclude>,
  Contacto: {
    oficina: "Oficina", cliente: "Cliente?", inmueble: "Inmueble?", creadoPor: "Usuario?",
  } satisfies Relaciones<Prisma.ContactoInclude>,
  Inmueble: {
    oficina: "Oficina", propietario: "Cliente?", bloque: "Bloque?", zona: "Zona", asesor: "Usuario?",
    creadoPor: "Usuario?", archivos: "Archivo[]", intereses: "Interes[]", operaciones: "Operacion[]",
    contactos: "Contacto[]", eventos: "Evento[]",
  } satisfies Relaciones<Prisma.InmuebleInclude>,
  Interes: {
    oficina: "Oficina", cliente: "Cliente", inmueble: "Inmueble", creadoPor: "Usuario?",
  } satisfies Relaciones<Prisma.InteresInclude>,
  Operacion: {
    oficina: "Oficina", cliente: "Cliente", inmueble: "Inmueble", creadoPor: "Usuario?",
  } satisfies Relaciones<Prisma.OperacionInclude>,
  Archivo: {
    oficina: "Oficina", cliente: "Cliente?", inmueble: "Inmueble?", creadoPor: "Usuario?",
  } satisfies Relaciones<Prisma.ArchivoInclude>,
  Actividad: { oficina: "Oficina", creadoPor: "Usuario?" } satisfies Relaciones<Prisma.ActividadInclude>,
  Zona: {
    oficina: "Oficina", creadoPor: "Usuario?", asesores: "ZonaAsesor[]", bloques: "Bloque[]",
    inmuebles: "Inmueble[]",
  } satisfies Relaciones<Prisma.ZonaInclude>,
  ZonaAsesor: { oficina: "Oficina", zona: "Zona", usuario: "Usuario" } satisfies Relaciones<Prisma.ZonaAsesorInclude>,
} satisfies Record<Prisma.ModelName, Record<string, TipoRelacion>>;

export type Relacion = { campo: string; modelo: Prisma.ModelName; lista: boolean; opcional: boolean };

function leer(campo: string, tipo: string): Relacion {
  const lista = tipo.endsWith("[]");
  const opcional = tipo.endsWith("?");
  return { campo, modelo: tipo.replace(/(\[\]|\?)$/, "") as Prisma.ModelName, lista, opcional };
}

/** The relation `campo` of `modelo`, or undefined for a scalar (or unknown) field. */
export function relacion(modelo: string, campo: string): Relacion | undefined {
  const campos = (RELACIONES as Record<string, Record<string, string>>)[modelo];
  if (!campos || !Object.hasOwn(campos, campo)) return undefined;
  return leer(campo, campos[campo]);
}

/** Every relation of `modelo`. */
export function relacionesDe(modelo: string): Relacion[] {
  const campos = (RELACIONES as Record<string, Record<string, string>>)[modelo] ?? {};
  return Object.entries(campos).map(([campo, tipo]) => leer(campo, tipo));
}
