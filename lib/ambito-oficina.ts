import { Prisma } from "@/lib/generated/prisma/client";
import { ErrorAmbito, relacion } from "@/lib/esquema";
import { acotarRelaciones, conAnd, filtroDe, visibilidad } from "@/lib/zonas";

export { ErrorAmbito };

/**
 * Prisma extension that confines every query to one office and, for an
 * advisor, to what their zones let them see (lib/zonas.ts).
 *
 * - Reads, updates and deletes get `oficinaId` (and the zone filter) added to
 *   `where`: a row of another office or zone is simply "not found" (P2025 on
 *   update/delete). `include`/`select` get the zone filter on their relations.
 * - Creates get `oficinaId` and, where the model has it, `creadoPorId`.
 * - Only the operations listed here are allowed; raw SQL and anything unknown
 *   throws, so a new Prisma operation can't silently bypass the scope.
 * - The activity log (Actividad) is append-only: create and read, nothing else.
 * - Nested writes (`connect`, `create`… under a relation) are rejected: they
 *   would skip this extension. Link rows with scalar ids instead; the database
 *   triggers `crm_misma_oficina` reject ids of another office.
 * - An advisor can't touch zones or their assignments, nor move a block or a
 *   property to another zone, nor create one in a zone that isn't theirs.
 * - `soloLectura`: every write throws, whatever the model. With the location
 *   control on, an advisor's `ctx.db` is like this until the action has checked
 *   where they are (`getContextoEscritura` in lib/db.ts).
 * - `lugar`: the checked place, stamped on every activity line written.
 * - The office row can be read; without a zone scope (a director), its location
 *   settings can also be updated, and nothing else.
 *
 * Nested reads are safe across offices: the triggers guarantee every relation
 * stays inside the office. Relation filters in `where` (`some`, `none`…) only
 * narrow the rows that the zone filter already allows.
 *
 * Kept free of Next.js imports so scripts and tests can use it.
 */

const CON_AUTOR = new Set<string>([
  "Evento", "Bloque", "Cliente", "Contacto", "Inmueble", "Operacion", "Archivo", "Interes", "Actividad", "Zona",
]);

const SOLO_WHERE = new Set([
  "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany",
  "count", "aggregate", "groupBy", "delete", "deleteMany",
]);
const LECTURA = new Set([
  "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy",
]);
const ACTUALIZAR = new Set(["update", "updateMany", "updateManyAndReturn"]);
const CREAR = new Set(["create", "createMany", "createManyAndReturn"]);
// The office itself can only be read, and only its own row…
const LECTURA_OFICINA = new Set(["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow"]);
// …except its location settings, which a director changes (lib/actions/ubicacion.ts).
const AJUSTES_OFICINA = new Set([
  "controlUbicacion", "controlUbicacionDesde", "latitud", "longitud", "radioMetros", "redes",
]);
// Models whose rows carry a zone.
const CON_ZONA = new Set(["Bloque", "Inmueble"]);

type Datos = Record<string, unknown>;

function comprobarDatos(modelo: string, datos: Datos, crear: boolean) {
  for (const campo of Object.keys(datos)) {
    if (relacion(modelo, campo)) {
      throw new ErrorAmbito(`Escritura anidada en ${modelo}.${campo}: usa el id escalar`);
    }
    if (!crear && (campo === "oficinaId" || campo === "creadoPorId")) {
      throw new ErrorAmbito(`${modelo}.${campo} no se puede modificar`);
    }
  }
}

export type OpcionesDb = {
  /** Reject every write, with this message. */
  soloLectura?: string;
  /** Where the user is (location control), stamped on new activity lines. */
  lugar?: string;
};

/**
 * `zonas`: the advisor's zone ids, or null for no zone scope (directors, the
 * seed, scripts and tests).
 */
export function extensionOficina(
  oficinaId: string,
  usuarioId: string,
  zonas: readonly string[] | null = null,
  opciones: OpcionesDb = {}
) {
  const vis = zonas ? visibilidad({ usuarioId, zonas }) : null;

  function datosNuevos(modelo: string, datos: Datos): Datos {
    comprobarDatos(modelo, datos, true);
    if (zonas && CON_ZONA.has(modelo) && !zonas.includes(datos.zonaId as string)) {
      throw new ErrorAmbito(`${modelo}: solo puedes crear en tus zonas`);
    }
    const conLugar = modelo === "Actividad" && opciones.lugar !== undefined ? { ...datos, lugar: opciones.lugar } : datos;
    return CON_AUTOR.has(modelo)
      ? { ...conLugar, oficinaId, creadoPorId: usuarioId }
      : { ...conLugar, oficinaId };
  }

  return Prisma.defineExtension({
    name: "ambito-oficina",
    query: {
      $allOperations({ model, operation, args, query }) {
        if (!model) {
          throw new ErrorAmbito(`${operation} no está permitido con el cliente de oficina`);
        }
        if (opciones.soloLectura && !LECTURA.has(operation)) {
          throw new ErrorAmbito(`${model}.${operation}: ${opciones.soloLectura}`);
        }
        const a = { ...(args as Record<string, unknown>) };

        if (model === "Oficina") {
          if (operation === "update" && !vis) {
            const campos = Object.keys((a.data as Datos | undefined) ?? {});
            const ajeno = campos.find((c) => !AJUSTES_OFICINA.has(c));
            if (ajeno || campos.length === 0) {
              throw new ErrorAmbito(`Oficina.${ajeno ?? "update"} no está permitido con el cliente de oficina`);
            }
            a.where = { id: oficinaId };
            return query(a);
          }
          if (!LECTURA_OFICINA.has(operation)) {
            throw new ErrorAmbito(`Oficina.${operation} no está permitido con el cliente de oficina`);
          }
          // AND, not an override: asking for another office's id finds nothing.
          a.where = { id: oficinaId, AND: [a.where ?? {}] };
          return query(a);
        }

        if (model === "Actividad" && !LECTURA.has(operation) && !CREAR.has(operation)) {
          throw new ErrorAmbito(`El registro de actividad no se puede modificar (${operation})`);
        }

        const filtro = vis ? filtroDe(vis, model) : undefined;
        if (vis && !LECTURA.has(operation)) {
          if (model === "Zona" || model === "ZonaAsesor") {
            throw new ErrorAmbito("Solo el director gestiona las zonas");
          }
          if (operation === "upsert" && filtro) {
            throw new ErrorAmbito(`${model}.upsert no está permitido con zonas`);
          }
          if (ACTUALIZAR.has(operation) && CON_ZONA.has(model) && (a.data as Datos | undefined)?.zonaId !== undefined) {
            throw new ErrorAmbito("Solo el director cambia la zona");
          }
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

        if (vis) {
          if (filtro && a.where) a.where = conAnd(a.where as Datos, filtro);
          if (a.include) a.include = acotarRelaciones(model, a.include, vis);
          if (a.select) a.select = acotarRelaciones(model, a.select, vis);
        }
        return query(a);
      },
    },
  });
}
