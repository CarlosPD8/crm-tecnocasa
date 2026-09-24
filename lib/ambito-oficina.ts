import { Prisma } from "@/lib/generated/prisma/client";

/**
 * Prisma extension that confines every query to one office.
 *
 * - Reads, updates and deletes get `oficinaId` added to `where` (a row of another
 *   office is simply "not found": P2025 on update/delete).
 * - Creates get `oficinaId` and, where the model has it, `creadoPorId`.
 * - Only the operations listed here are allowed; raw SQL and anything unknown
 *   throws, so a new Prisma operation can't silently bypass the scope.
 * - Nested writes (`connect`, `create`… under a relation) are rejected: they
 *   would skip this extension. Link rows with scalar ids instead; the database
 *   triggers `crm_misma_oficina` reject ids of another office.
 *
 * Nested reads (`include`, `select`, `_count`, `some`/`none` filters) are safe as
 * they are: the triggers guarantee every relation stays inside the office.
 *
 * Kept free of Next.js imports so scripts and tests can use it.
 */

export class ErrorAmbito extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorAmbito";
  }
}

type Relaciones<Include> = Record<Exclude<keyof Include, "_count">, true>;

// Relation fields per model. Typed as exhaustive records: adding a relation to
// the schema without listing it here is a type error.
const RELACIONES: Record<Prisma.ModelName, Record<string, true>> = {
  Oficina: {
    usuarios: true, clientes: true, inmuebles: true, bloques: true, contactos: true,
    eventos: true, intereses: true, operaciones: true, archivos: true,
  } satisfies Relaciones<Prisma.OficinaInclude>,
  Usuario: {
    oficina: true, clientesCreados: true, clientesAsignados: true, inmueblesCreados: true,
    inmueblesAsignados: true, bloquesCreados: true, contactosCreados: true,
    eventosCreados: true, operacionesCreadas: true, archivosCreados: true,
  } satisfies Relaciones<Prisma.UsuarioInclude>,
  Evento: { oficina: true, cliente: true, inmueble: true, creadoPor: true } satisfies Relaciones<Prisma.EventoInclude>,
  Bloque: { oficina: true, creadoPor: true, inmuebles: true } satisfies Relaciones<Prisma.BloqueInclude>,
  Cliente: {
    oficina: true, asesor: true, creadoPor: true, contactos: true, archivos: true,
    intereses: true, operaciones: true, inmueblesEnPropiedad: true, eventos: true,
  } satisfies Relaciones<Prisma.ClienteInclude>,
  Contacto: { oficina: true, cliente: true, inmueble: true, creadoPor: true } satisfies Relaciones<Prisma.ContactoInclude>,
  Inmueble: {
    oficina: true, propietario: true, bloque: true, asesor: true, creadoPor: true,
    archivos: true, intereses: true, operaciones: true, contactos: true, eventos: true,
  } satisfies Relaciones<Prisma.InmuebleInclude>,
  Interes: { oficina: true, cliente: true, inmueble: true } satisfies Relaciones<Prisma.InteresInclude>,
  Operacion: { oficina: true, cliente: true, inmueble: true, creadoPor: true } satisfies Relaciones<Prisma.OperacionInclude>,
  Archivo: { oficina: true, cliente: true, inmueble: true, creadoPor: true } satisfies Relaciones<Prisma.ArchivoInclude>,
};

const CON_AUTOR = new Set<string>(["Evento", "Bloque", "Cliente", "Contacto", "Inmueble", "Operacion", "Archivo"]);

const SOLO_WHERE = new Set([
  "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany",
  "count", "aggregate", "groupBy", "delete", "deleteMany",
]);
const ACTUALIZAR = new Set(["update", "updateMany", "updateManyAndReturn"]);
const CREAR = new Set(["create", "createMany", "createManyAndReturn"]);
// The office itself can only be read, and only its own row.
const LECTURA_OFICINA = new Set(["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow"]);

type Datos = Record<string, unknown>;

function comprobarDatos(modelo: string, datos: Datos, crear: boolean) {
  for (const campo of Object.keys(datos)) {
    if (RELACIONES[modelo as Prisma.ModelName][campo]) {
      throw new ErrorAmbito(`Escritura anidada en ${modelo}.${campo}: usa el id escalar`);
    }
    if (!crear && (campo === "oficinaId" || campo === "creadoPorId")) {
      throw new ErrorAmbito(`${modelo}.${campo} no se puede modificar`);
    }
  }
}

export function extensionOficina(oficinaId: string, usuarioId: string) {
  function datosNuevos(modelo: string, datos: Datos): Datos {
    comprobarDatos(modelo, datos, true);
    return CON_AUTOR.has(modelo)
      ? { ...datos, oficinaId, creadoPorId: usuarioId }
      : { ...datos, oficinaId };
  }

  return Prisma.defineExtension({
    name: "ambito-oficina",
    query: {
      $allOperations({ model, operation, args, query }) {
        if (!model) {
          throw new ErrorAmbito(`${operation} no está permitido con el cliente de oficina`);
        }
        const a = { ...(args as Record<string, unknown>) };

        if (model === "Oficina") {
          if (!LECTURA_OFICINA.has(operation)) {
            throw new ErrorAmbito(`Oficina.${operation} no está permitido con el cliente de oficina`);
          }
          // AND, not an override: asking for another office's id finds nothing.
          a.where = { id: oficinaId, AND: [a.where ?? {}] };
          return query(a);
        }

        if (SOLO_WHERE.has(operation)) {
          a.where = { ...(a.where as Datos | undefined), oficinaId };
        } else if (ACTUALIZAR.has(operation)) {
          comprobarDatos(model, a.data as Datos, false);
          a.where = { ...(a.where as Datos | undefined), oficinaId };
        } else if (CREAR.has(operation)) {
          a.data = Array.isArray(a.data)
            ? (a.data as Datos[]).map((d) => datosNuevos(model, d))
            : datosNuevos(model, a.data as Datos);
        } else if (operation === "upsert") {
          comprobarDatos(model, a.update as Datos, false);
          a.where = { ...(a.where as Datos | undefined), oficinaId };
          a.create = datosNuevos(model, a.create as Datos);
        } else {
          throw new ErrorAmbito(`${model}.${operation} no está permitido con el cliente de oficina`);
        }
        return query(a);
      },
    },
  });
}
