import type { DbOficina } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { ErrorAmbito, relacion, relacionesDe } from "@/lib/esquema";

/**
 * What an advisor can see inside the office, by zone. Applied on the server by
 * the scope extension (lib/ambito-oficina.ts), like the office isolation: the
 * director has no zone scope and sees everything.
 *
 * An advisor sees:
 * - properties of their zones, plus the ones they're the advisor of;
 * - blocks of their zones;
 * - their clients, plus anyone linked to a property they see (owner, interested
 *   party, buyer or tenant, or contacted about it);
 * - contacts, files, interests and operations of what they see;
 * - events they created, and the rest unless linked to something they don't see.
 * With no zones they see no properties or blocks (only their own clients).
 *
 * Kept free of Next.js imports so scripts and tests can use it.
 */

export type Alcance = { usuarioId: string; zonas: readonly string[] };

export type Visibilidad = {
  Inmueble: Prisma.InmuebleWhereInput;
  Bloque: Prisma.BloqueWhereInput;
  Cliente: Prisma.ClienteWhereInput;
  Contacto: Prisma.ContactoWhereInput;
  Archivo: Prisma.ArchivoWhereInput;
  Interes: Prisma.InteresWhereInput;
  Operacion: Prisma.OperacionWhereInput;
  Evento: Prisma.EventoWhereInput;
};

export type ModeloPorZona = keyof Visibilidad;

const NADA = { id: { in: [] as string[] } };

export function visibilidad({ usuarioId, zonas }: Alcance): Visibilidad {
  const conZonas = zonas.length > 0;
  const enZonas = { zonaId: { in: [...zonas] } };

  const inmueble: Prisma.InmuebleWhereInput = conZonas ? { OR: [enZonas, { asesorId: usuarioId }] } : NADA;
  const bloque: Prisma.BloqueWhereInput = conZonas ? enZonas : NADA;
  const cliente: Prisma.ClienteWhereInput = conZonas
    ? {
        OR: [
          { asesorId: usuarioId },
          { inmueblesEnPropiedad: { some: inmueble } },
          { intereses: { some: { inmueble } } },
          { operaciones: { some: { inmueble } } },
          { contactos: { some: { inmueble } } },
        ],
      }
    : { asesorId: usuarioId };
  // Notes and files hang from the property when they have one, else from the client.
  const deFicha = { OR: [{ inmueble }, { inmuebleId: null, cliente }] };

  return {
    Inmueble: inmueble,
    Bloque: bloque,
    Cliente: cliente,
    Contacto: deFicha,
    Archivo: deFicha,
    Interes: { inmueble },
    Operacion: { inmueble },
    Evento: {
      OR: [
        { creadoPorId: usuarioId },
        {
          AND: [
            { OR: [{ inmuebleId: null }, { inmueble }] },
            { OR: [{ clienteId: null }, { cliente }] },
          ],
        },
      ],
    },
  };
}

export function filtroDe(vis: Visibilidad, modelo: string): object | undefined {
  return Object.hasOwn(vis, modelo) ? vis[modelo as ModeloPorZona] : undefined;
}

type Objeto = Record<string, unknown>;

/**
 * Adds a condition to a `where` without touching what's there: unique keys stay
 * at the top (findUnique, update and delete need them) and an existing `AND`
 * is kept.
 */
export function conAnd<T extends object>(where: T | undefined, condicion: object): T {
  const w: Objeto = { ...where };
  const previo = w.AND;
  w.AND = previo === undefined ? [condicion] : Array.isArray(previo) ? [...previo, condicion] : [previo, condicion];
  return w as T;
}

function acotarConteo(modelo: string, conteo: unknown, vis: Visibilidad): unknown {
  if (conteo === true) {
    const filtradas = relacionesDe(modelo).filter((r) => r.lista && filtroDe(vis, r.modelo));
    if (filtradas.length) {
      throw new ErrorAmbito(
        `${modelo}._count: true contaría ${filtradas.map((r) => r.campo).join(", ")} sin filtrar por zona: usa _count.select`
      );
    }
    return conteo;
  }
  if (!conteo || typeof conteo !== "object") return conteo;
  const { select, ...resto } = conteo as Objeto;
  if (!select || typeof select !== "object") return conteo;

  const acotado: Objeto = {};
  for (const [campo, valor] of Object.entries(select as Objeto)) {
    const rel = relacion(modelo, campo);
    const filtro = rel && filtroDe(vis, rel.modelo);
    if (!filtro || !valor) {
      acotado[campo] = valor;
      continue;
    }
    const args = valor === true ? {} : (valor as Objeto);
    acotado[campo] = { ...args, where: conAnd(args.where as Objeto | undefined, filtro) };
  }
  return { ...resto, select: acotado };
}

/**
 * Walks an `include` or `select` (nested ones too) and adds the zone filter to
 * every list or optional relation that points to a filtered model, so a client
 * page never lists a property of another zone. Required relations need no
 * filter: a visible interest or operation always points to a visible property
 * and client.
 */
export function acotarRelaciones(modelo: string, seleccion: unknown, vis: Visibilidad): unknown {
  if (!seleccion || typeof seleccion !== "object") return seleccion;

  const acotada: Objeto = {};
  for (const [campo, valor] of Object.entries(seleccion as Objeto)) {
    if (campo === "_count") {
      acotada[campo] = acotarConteo(modelo, valor, vis);
      continue;
    }
    const rel = relacion(modelo, campo);
    if (!rel || !valor) {
      acotada[campo] = valor;
      continue;
    }
    const args: Objeto = valor === true ? {} : { ...(valor as Objeto) };
    if (args.include) args.include = acotarRelaciones(rel.modelo, args.include, vis);
    if (args.select) args.select = acotarRelaciones(rel.modelo, args.select, vis);
    const filtro = filtroDe(vis, rel.modelo);
    if (filtro && (rel.lista || rel.opcional)) args.where = conAnd(args.where as Objeto | undefined, filtro);
    acotada[campo] = valor === true && Object.keys(args).length === 0 ? true : args;
  }
  return acotada;
}

/**
 * Deletes a zone after moving its blocks and loose properties to another one
 * (a block's flats follow it: trigger Bloque_zona_a_pisos). An empty zone
 * needs no destination. Its advisors simply stop having it. Director only;
 * call inside a transaction.
 */
export async function moverYBorrarZona(
  tx: Pick<DbOficina, "bloque" | "inmueble" | "zona">,
  id: string,
  destinoId: string | null
): Promise<{ bloques: number; pisos: number }> {
  if (id === destinoId) throw new Error("La zona de destino tiene que ser otra");
  const [bloques, pisos] = await Promise.all([
    tx.bloque.count({ where: { zonaId: id } }),
    tx.inmueble.count({ where: { zonaId: id } }),
  ]);
  if (bloques + pisos > 0) {
    if (!destinoId) throw new Error("Falta la zona a la que pasar sus bloques y pisos");
    await tx.bloque.updateMany({ where: { zonaId: id }, data: { zonaId: destinoId } });
    await tx.inmueble.updateMany({ where: { zonaId: id }, data: { zonaId: destinoId } });
  }
  await tx.zona.delete({ where: { id } });
  return { bloques, pisos };
}
