import type { Prisma } from "@/lib/generated/prisma/client";
import { condicionFecha, leerBool, leerFecha, leerMulti, leerRango } from "@/lib/filtros/tipos";
import { FILTROS_BLOQUES, FILTROS_CLIENTES, FILTROS_INMUEBLES } from "@/lib/filtros/definiciones";
import { TIPO_CLIENTE_LABELS, normalizarDni } from "@/lib/validations/cliente";
import {
  ESTADO_INMUEBLE_LABELS,
  OCUPACION_LABELS,
  TIPO_INMUEBLE_LABELS,
  TIPO_OPERACION_LABELS,
} from "@/lib/validations/inmueble";

type SP = Record<string, string | undefined>;

const claves = <T extends object>(o: T) => Object.keys(o) as (keyof T & string)[];

/** Adds `siTrue` / `siFalse` when a yes/no filter is set. */
function booleano<W>(valor: string | undefined, siTrue: W, siFalse: W): W[] {
  const b = leerBool(valor);
  return b === null ? [] : [b ? siTrue : siFalse];
}

/** `c` is null for «Sin fecha». */
function fecha<W>(valor: string | undefined, campo: (c: { gte?: Date; lt?: Date } | null) => W): W[] {
  const r = leerFecha(valor);
  if (!r) return [];
  return [campo(condicionFecha(r))];
}

function rango(valor: string | undefined) {
  const r = leerRango(valor);
  if (!r) return null;
  return { ...(r.min !== undefined ? { gte: r.min } : {}), ...(r.max !== undefined ? { lte: r.max } : {}) };
}

const contiene = (s: string) => ({ contains: s.trim(), mode: "insensitive" as const });

/** Occupancy values from the URL; «Sin datos» is stored as null. */
function ocupacion(valor: string | undefined) {
  const lista = leerMulti(valor, claves(OCUPACION_LABELS));
  if (!lista.length) return null;
  const conValor = lista.filter((v) => v !== "SIN_DATOS") as ("INQUILINOS" | "PROPIETARIO" | "VACIO")[];
  return [
    ...(conValor.length ? [{ ocupacion: { in: conValor } }] : []),
    ...(lista.includes("SIN_DATOS") ? [{ ocupacion: null }] : []),
  ];
}

function leerOrden<T extends Record<string, string>>(orden: T, valor: string | undefined) {
  return (valor && valor in orden ? valor : claves(orden)[0]) as keyof T;
}

// ─── Clientes ───────────────────────────────────────────────────────────────

export function consultaClientes(sp: SP) {
  const ahora = new Date();
  const and: Prisma.ClienteWhereInput[] = [];

  const tipos = leerMulti(sp.tipo, claves(TIPO_CLIENTE_LABELS));
  if (tipos.length) and.push({ tipos: { hasSome: tipos as (keyof typeof TIPO_CLIENTE_LABELS)[] } });

  const interes = leerMulti(sp.interes, claves(TIPO_OPERACION_LABELS));
  if (interes.length) {
    and.push({ intereses: { some: { inmueble: { tipoOperacion: { in: interes as ("VENTA" | "ALQUILER")[] } } } } });
  }

  and.push(
    ...booleano(sp.propietario, { inmueblesEnPropiedad: { some: {} } }, { inmueblesEnPropiedad: { none: {} } }),
    ...booleano(sp.operaciones, { operaciones: { some: {} } }, { operaciones: { none: {} } }),
    ...booleano(sp.citas, { eventos: { some: { fin: { gte: ahora } } } }, { eventos: { none: { fin: { gte: ahora } } } }),
    ...booleano(sp.telefono, { telefono: { not: null } }, { telefono: null }),
    ...booleano(sp.email, { email: { not: null } }, { email: null }),
    ...booleano(sp.dni, { dni: { not: null } }, { dni: null }),
    ...fecha(sp.proximo, (c) => ({ fechaProximoContacto: c })),
    ...fecha(sp.ultimo, (c) => ({ fechaUltimoContacto: c })),
    ...fecha(sp.alta, (c) => ({ createdAt: c ?? undefined })),
  );
  if (sp.direccion?.trim()) and.push({ direccion: contiene(sp.direccion) });
  if (sp.notas?.trim()) and.push({ notas: contiene(sp.notas) });

  const q = sp.q?.trim();
  if (q) {
    and.push({
      OR: [
        { nombre: contiene(q) },
        { apellidos: contiene(q) },
        { telefono: contiene(q) },
        { email: contiene(q) },
        { dni: { contains: normalizarDni(q), mode: "insensitive" } },
      ],
    });
  }

  const orden = leerOrden(FILTROS_CLIENTES.orden, sp.orden);
  const orderBy: Prisma.ClienteOrderByWithRelationInput[] = {
    recientes: [{ createdAt: "desc" as const }],
    antiguos: [{ createdAt: "asc" as const }],
    nombre: [{ nombre: "asc" as const }, { apellidos: "asc" as const }],
    proximo: [{ fechaProximoContacto: { sort: "asc" as const, nulls: "last" as const } }],
    ultimo: [{ fechaUltimoContacto: { sort: "asc" as const, nulls: "first" as const } }],
  }[orden];

  return { where: { AND: and } satisfies Prisma.ClienteWhereInput, orderBy };
}

// ─── Inmuebles ──────────────────────────────────────────────────────────────

export function consultaInmuebles(sp: SP) {
  const ahora = new Date();
  const and: Prisma.InmuebleWhereInput[] = [];

  const operaciones = leerMulti(sp.tipoOperacion, claves(TIPO_OPERACION_LABELS));
  if (operaciones.length) and.push({ tipoOperacion: { in: operaciones as ("VENTA" | "ALQUILER")[] } });
  const estados = leerMulti(sp.estado, claves(ESTADO_INMUEBLE_LABELS));
  if (estados.length) and.push({ estado: { in: estados as (keyof typeof ESTADO_INMUEBLE_LABELS)[] } });
  const tipos = leerMulti(sp.tipoInmueble, claves(TIPO_INMUEBLE_LABELS));
  if (tipos.length) and.push({ tipoInmueble: { in: tipos as (keyof typeof TIPO_INMUEBLE_LABELS)[] } });
  const localidades = leerMulti(sp.localidad);
  if (localidades.length) and.push({ localidad: { in: localidades } });
  const ocup = ocupacion(sp.ocupacion);
  if (ocup) and.push({ OR: ocup });

  const precio = rango(sp.precio);
  if (precio) and.push({ precio });
  const metros = rango(sp.metros);
  if (metros) and.push({ metrosCuadrados: metros });
  const habitaciones = rango(sp.habitaciones);
  if (habitaciones) and.push({ habitaciones });
  const banos = rango(sp.banos);
  if (banos) and.push({ banos });
  const planta = rango(sp.planta);
  if (planta) and.push({ planta });

  if (sp.bloque?.trim()) {
    and.push({ bloque: { OR: [{ calle: contiene(sp.bloque) }, { nombre: contiene(sp.bloque) }] } });
  }
  if (sp.escalera?.trim()) and.push({ escalera: contiene(sp.escalera) });
  if (sp.descripcion?.trim()) and.push({ descripcion: contiene(sp.descripcion) });

  and.push(
    ...booleano(sp.enBloque, { bloqueId: { not: null } }, { bloqueId: null }),
    ...booleano(sp.potencial, { adquisicionPotencial: true }, { adquisicionPotencial: false }),
    ...booleano(sp.propietario, { propietarioId: { not: null } }, { propietarioId: null }),
    ...booleano(sp.interesados, { intereses: { some: {} } }, { intereses: { none: {} } }),
    ...booleano(sp.citas, { eventos: { some: { fin: { gte: ahora } } } }, { eventos: { none: { fin: { gte: ahora } } } }),
    ...booleano(sp.fotos, { archivos: { some: { categoria: "FOTO" as const } } }, { archivos: { none: { categoria: "FOTO" as const } } }),
    ...booleano(sp.operaciones, { operaciones: { some: {} } }, { operaciones: { none: {} } }),
    ...fecha(sp.ultimo, (c) => ({ fechaUltimoContacto: c })),
    ...fecha(sp.alta, (c) => ({ createdAt: c ?? undefined })),
  );

  const q = sp.q?.trim();
  if (q) {
    and.push({
      OR: [
        { referencia: contiene(q) },
        { direccion: contiene(q) },
        { localidad: contiene(q) },
        { bloque: { calle: contiene(q) } },
        { bloque: { nombre: contiene(q) } },
        { propietario: { OR: [{ nombre: contiene(q) }, { apellidos: contiene(q) }] } },
      ],
    });
  }

  const orden = leerOrden(FILTROS_INMUEBLES.orden, sp.orden);
  const orderBy: Prisma.InmuebleOrderByWithRelationInput[] = {
    recientes: [{ createdAt: "desc" as const }],
    precioAsc: [{ precio: "asc" as const }],
    precioDesc: [{ precio: "desc" as const }],
    metros: [{ metrosCuadrados: { sort: "desc" as const, nulls: "last" as const } }],
    referencia: [{ referencia: "asc" as const }],
    ultimo: [{ fechaUltimoContacto: { sort: "asc" as const, nulls: "first" as const } }],
    ubicacion: [
      { bloque: { calle: "asc" as const } },
      { escalera: { sort: "asc" as const, nulls: "last" as const } },
      { planta: { sort: "asc" as const, nulls: "last" as const } },
      { puerta: { sort: "asc" as const, nulls: "last" as const } },
    ],
  }[orden];

  return { where: { AND: and } satisfies Prisma.InmuebleWhereInput, orderBy };
}

// ─── Bloques ────────────────────────────────────────────────────────────────

export function consultaBloques(sp: SP) {
  const and: Prisma.BloqueWhereInput[] = [];

  const localidades = leerMulti(sp.localidad);
  if (localidades.length) and.push({ localidad: { in: localidades } });
  if (sp.cp?.trim()) and.push({ codigoPostal: contiene(sp.cp) });
  const ocup = ocupacion(sp.ocupacion);
  if (ocup) and.push({ inmuebles: { some: { OR: ocup } } });

  and.push(
    ...booleano(
      sp.potenciales,
      { inmuebles: { some: { adquisicionPotencial: true } } },
      { inmuebles: { none: { adquisicionPotencial: true } } }
    ),
    ...booleano(
      sp.disponibles,
      { inmuebles: { some: { estado: "DISPONIBLE" as const } } },
      { inmuebles: { none: { estado: "DISPONIBLE" as const } } }
    ),
    ...booleano(sp.conPisos, { inmuebles: { some: {} } }, { inmuebles: { none: {} } }),
    ...fecha(sp.alta, (c) => ({ createdAt: c ?? undefined })),
  );

  const q = sp.q?.trim();
  if (q) {
    and.push({
      OR: [{ calle: contiene(q) }, { numero: contiene(q) }, { nombre: contiene(q) }, { localidad: contiene(q) }],
    });
  }

  const orden = leerOrden(FILTROS_BLOQUES.orden, sp.orden);
  const orderBy: Prisma.BloqueOrderByWithRelationInput[] = {
    calle: [{ calle: "asc" as const }, { numero: "asc" as const }],
    localidad: [{ localidad: "asc" as const }, { calle: "asc" as const }, { numero: "asc" as const }],
    recientes: [{ createdAt: "desc" as const }],
  }[orden];

  return { where: { AND: and } satisfies Prisma.BloqueWhereInput, orderBy };
}
