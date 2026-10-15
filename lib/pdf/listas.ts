import "server-only";
import type { NextRequest } from "next/server";

import { getContextoApi, opcionesAsesor, zonasVisibles, type Contexto } from "@/lib/db";
import { resumenPorBloque } from "@/lib/bloques";
import { fechaCorta } from "@/lib/actividad";
import { respuestaError } from "@/lib/exportar/excel";
import { LIMITE_PDF } from "@/lib/exportar/limite";
import { consultaBloques, consultaClientes, consultaInmuebles } from "@/lib/filtros/consultas";
import { DEFINICIONES, opcionesFiltroAsesor } from "@/lib/filtros/definiciones";
import { describirValor, hoyISO, type Campo } from "@/lib/filtros/tipos";
import { formatBloque } from "@/lib/validations/bloque";
import { ordenarEtiquetas, TIPO_CLIENTE_LABELS } from "@/lib/validations/cliente";
import { ESTADO_INMUEBLE_LABELS, formatUbicacion, ocupacionLabel } from "@/lib/validations/inmueble";
import type { Captacion } from "@/lib/generated/prisma/enums";
import { respuestaPdf } from "@/lib/pdf/tabla";

/**
 * PDFs of the lists (with the filters on screen) and the street sheets: the
 * filtered flats grouped by block, or one block. Any user of the office can
 * print them (an advisor gets their zones only); the Excel stays director-only.
 */

type Lista = "clientes" | "inmuebles" | "bloques";

const CAPTACION_CORTA: Record<Captacion, string> = { POTENCIAL: "Potencial", NOTICIA: "Noticia" };
const captacion = (c: Captacion | null) => (c ? CAPTACION_CORTA[c] : "");

/** Day in Spain of a moment (last contact), as «16/10/2026». */
function diaMadrid(fecha: Date | null) {
  if (!fecha) return "";
  const [y, m, d] = hoyISO(fecha).split("-");
  return `${d}/${m}/${y}`;
}

const nombre = (p: { nombre: string; apellidos: string } | null) => (p ? `${p.nombre} ${p.apellidos}` : "");

const plural = (n: number, uno: string, varios: string) => `${n.toLocaleString("es-ES")} ${n === 1 ? uno : varios}`;

/** «Filtros: Estado: Disponible · Captación: Noticia», as the chips on screen say. */
async function describirFiltros(ctx: Contexto, lista: Lista, sp: Record<string, string>, conOrden = true) {
  const definicion = DEFINICIONES[lista];
  const campos = definicion.campos as readonly Campo[];
  const usa = (clave: string) => Boolean(sp[clave]) && campos.some((c) => c.clave === clave);
  const opciones: Record<string, Record<string, string>> = {
    ...(usa("asesor") ? { asesor: opcionesFiltroAsesor(await opcionesAsesor(ctx.db)) } : {}),
    ...(usa("zona") ? { zona: Object.fromEntries((await zonasVisibles(ctx)).map((z) => [z.id, z.nombre])) } : {}),
  };
  const partes = campos.flatMap((c) => {
    const texto = sp[c.clave] && describirValor(c, sp[c.clave], opciones[c.clave as keyof typeof opciones]);
    return texto ? [`${c.etiqueta}: ${texto}`] : [];
  });
  if (sp.q?.trim()) partes.unshift(`Búsqueda: «${sp.q.trim()}»`);
  const ordenes = definicion.orden as Record<string, string>;
  const orden =
    conOrden && sp.orden && ordenes[sp.orden] && sp.orden !== Object.keys(ordenes)[0] ? ordenes[sp.orden] : null;
  return [
    partes.length ? `Filtros: ${partes.join(" · ")}` : "Sin filtros",
    ...(orden ? [`Orden: ${orden}`] : []),
  ];
}

function demasiadas(total: number) {
  return total > LIMITE_PDF
    ? respuestaError(
        413,
        `Hay ${total} registros con estos filtros; el máximo por PDF es ${LIMITE_PDF}. Añade algún filtro y vuelve a intentarlo.`
      )
    : null;
}

export async function pdfLista(request: NextRequest, lista: Lista) {
  const ctx = await getContextoApi();
  if (!ctx) return respuestaError(401, "Inicia sesión para sacar el PDF.");
  const { db, oficina } = ctx;
  const sp = Object.fromEntries(request.nextUrl.searchParams);
  if (lista === "inmuebles" && sp.formato === "hoja") return pdfHojaCalle(ctx, sp);
  const lineas = await describirFiltros(ctx, lista, sp);

  if (lista === "inmuebles") {
    const { where, orderBy } = consultaInmuebles(sp);
    const error = demasiadas(await db.inmueble.count({ where }));
    if (error) return error;
    const filas = await db.inmueble.findMany({
      where,
      orderBy,
      include: {
        bloque: { select: { calle: true, numero: true } },
        zona: { select: { nombre: true } },
        propietario: { select: { nombre: true, apellidos: true, telefono: true } },
      },
    });
    const noticias = filas.filter((i) => i.captacion === "NOTICIA").length;
    const potenciales = filas.filter((i) => i.captacion === "POTENCIAL").length;
    return respuestaPdf({
      titulo: "Inmuebles",
      oficina: oficina.nombre,
      lineas,
      archivo: "inmuebles",
      filas,
      columnas: [
        { titulo: "Referencia", peso: 1, valor: (i) => i.referencia },
        {
          titulo: "Dirección",
          peso: 2.4,
          valor: (i) => [i.direccion, formatUbicacion(i)].filter(Boolean).join(" · "),
        },
        { titulo: "Bloque", peso: 1.4, valor: (i) => (i.bloque ? formatBloque(i.bloque) : "") },
        { titulo: "Zona", peso: 1, valor: (i) => i.zona?.nombre },
        { titulo: "Captación", peso: 0.9, valor: (i) => captacion(i.captacion) },
        { titulo: "Estado", peso: 0.9, valor: (i) => ESTADO_INMUEBLE_LABELS[i.estado] },
        { titulo: "Propietario", peso: 1.8, valor: (i) => nombre(i.propietario) },
        { titulo: "Teléfono", peso: 1.1, valor: (i) => i.propietario?.telefono },
        { titulo: "Último contacto", peso: 1, valor: (i) => diaMadrid(i.fechaUltimoContacto) },
        { titulo: "Próximo contacto", peso: 1, valor: (i) => fechaCorta(i.fechaProximoContacto) },
      ],
      totales: [
        plural(filas.length, "inmueble", "inmuebles"),
        plural(noticias, "noticia", "noticias"),
        plural(potenciales, "potencial", "potenciales"),
      ].join(" · "),
    });
  }

  if (lista === "clientes") {
    const { where, orderBy } = consultaClientes(sp);
    const error = demasiadas(await db.cliente.count({ where }));
    if (error) return error;
    const filas = await db.cliente.findMany({ where, orderBy, include: { asesor: { select: { nombre: true } } } });
    return respuestaPdf({
      titulo: "Clientes",
      oficina: oficina.nombre,
      lineas,
      archivo: "clientes",
      filas,
      columnas: [
        { titulo: "Nombre", peso: 1.8, valor: (c) => nombre(c) },
        {
          titulo: "Etiquetas",
          peso: 1.4,
          valor: (c) => ordenarEtiquetas(c.tipos).map((t) => TIPO_CLIENTE_LABELS[t]).join(", "),
        },
        { titulo: "Teléfono", peso: 1.1, valor: (c) => c.telefono },
        { titulo: "Email", peso: 2, valor: (c) => c.email },
        { titulo: "Dirección", peso: 2, valor: (c) => c.direccion },
        { titulo: "Asesor", peso: 1.1, valor: (c) => c.asesor?.nombre },
        { titulo: "Último contacto", peso: 1, valor: (c) => diaMadrid(c.fechaUltimoContacto) },
        { titulo: "Próximo contacto", peso: 1, valor: (c) => fechaCorta(c.fechaProximoContacto) },
      ],
      totales: plural(filas.length, "cliente", "clientes"),
    });
  }

  const { where, orderBy } = consultaBloques(sp);
  const error = demasiadas(await db.bloque.count({ where }));
  if (error) return error;
  const bloques = await db.bloque.findMany({
    where,
    orderBy,
    include: { zona: { select: { nombre: true } }, _count: { select: { inmuebles: true } } },
  });
  const resumen = await resumenPorBloque(db, bloques.map((b) => b.id));
  const filas = bloques.map((b) => ({ ...b, resumen: resumen.get(b.id)! }));
  const suma = (f: (b: (typeof filas)[number]) => number) => filas.reduce((s, b) => s + f(b), 0);
  const numero = (n: number) => String(n);
  return respuestaPdf({
    titulo: "Bloques",
    oficina: oficina.nombre,
    lineas,
    archivo: "bloques",
    filas,
    columnas: [
      { titulo: "Bloque", peso: 1.8, valor: (b) => formatBloque(b) },
      { titulo: "Nombre", peso: 1.4, valor: (b) => b.nombre },
      { titulo: "Localidad", peso: 1.4, valor: (b) => b.localidad },
      { titulo: "Zona", peso: 1, valor: (b) => b.zona?.nombre },
      { titulo: "Pisos", peso: 0.6, derecha: true, valor: (b) => numero(b._count.inmuebles) },
      { titulo: "Con inquilinos", peso: 0.8, derecha: true, valor: (b) => numero(b.resumen.ocupacion.INQUILINOS) },
      { titulo: "Vive el propietario", peso: 0.9, derecha: true, valor: (b) => numero(b.resumen.ocupacion.PROPIETARIO) },
      { titulo: "Vacíos", peso: 0.6, derecha: true, valor: (b) => numero(b.resumen.ocupacion.VACIO) },
      { titulo: "Sin datos", peso: 0.7, derecha: true, valor: (b) => numero(b.resumen.ocupacion.SIN_DATOS) },
      { titulo: "Noticias", peso: 0.7, derecha: true, valor: (b) => numero(b.resumen.noticias) },
      { titulo: "Potenciales", peso: 0.8, derecha: true, valor: (b) => numero(b.resumen.potenciales) },
    ],
    totales: [
      plural(filas.length, "bloque", "bloques"),
      plural(suma((b) => b._count.inmuebles), "piso", "pisos"),
      plural(suma((b) => b.resumen.noticias), "noticia", "noticias"),
      plural(suma((b) => b.resumen.potenciales), "potencial", "potenciales"),
    ].join(" · "),
  });
}

/** «c-estrellas-22»: a file name without accents or symbols. */
function slug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Street order: «C/ Estrellas 2» before «C/ Estrellas 10».
const NATURAL = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

/** Floor «Bajo» (0) before the first, unknown ones last. */
const porPlanta = (a: number | null, b: number | null) => (a ?? Infinity) - (b ?? Infinity);

/**
 * The street sheet of the filtered flats, the one advisors print to go out:
 * grouped by block (street order, then staircase, floor and door), loose flats
 * at the end, with room to write. Same columns as the block sheet.
 */
async function pdfHojaCalle(ctx: Contexto, sp: Record<string, string>) {
  const { db, oficina } = ctx;
  const { where } = consultaInmuebles(sp);
  const error = demasiadas(await db.inmueble.count({ where }));
  if (error) return error;

  const [pisos, lineas] = await Promise.all([
    db.inmueble.findMany({
      where,
      include: {
        bloque: { select: { calle: true, numero: true, localidad: true } },
        zona: { select: { nombre: true } },
        propietario: { select: { nombre: true, apellidos: true, telefono: true } },
      },
    }),
    describirFiltros(ctx, "inmuebles", sp, false),
  ]);

  // A block the advisor doesn't see (another zone) still groups by its address.
  const enBloque = (p: (typeof pisos)[number]) =>
    p.bloque
      ? `${formatBloque(p.bloque)} · ${p.bloque.localidad}`
      : p.bloqueId
        ? `${p.direccion} · ${p.localidad}`
        : null;
  pisos.sort((a, b) => {
    const [ga, gb] = [enBloque(a), enBloque(b)];
    if (!ga !== !gb) return ga ? -1 : 1;
    return (
      NATURAL.compare(ga ?? `${a.direccion} · ${a.localidad}`, gb ?? `${b.direccion} · ${b.localidad}`) ||
      NATURAL.compare(a.escalera ?? "", b.escalera ?? "") ||
      porPlanta(a.planta, b.planta) ||
      NATURAL.compare(a.puerta ?? "", b.puerta ?? "")
    );
  });

  const cuantos = new Map<string, number>();
  for (const p of pisos) {
    const g = enBloque(p) ?? "";
    cuantos.set(g, (cuantos.get(g) ?? 0) + 1);
  }
  // The zone goes in each band only when the sheet spans several.
  const variasZonas = new Set(pisos.map((p) => p.zonaId)).size > 1;
  const zonaUnica = !variasZonas && pisos[0]?.zona?.nombre;

  return respuestaPdf({
    titulo: zonaUnica ? `Hoja para la calle · ${zonaUnica}` : "Hoja para la calle",
    oficina: oficina.nombre,
    lineas,
    archivo: zonaUnica ? `hoja-${slug(zonaUnica)}` : "hoja-para-la-calle",
    filas: pisos,
    altoMinimoFila: 26,
    grupo: (p) => {
      const g = enBloque(p);
      const zona = variasZonas && p.zona ? ` · ${p.zona.nombre}` : "";
      return g ? `${g}${zona} · ${plural(cuantos.get(g) ?? 0, "piso", "pisos")}` : "Pisos fuera de bloque";
    },
    columnas: [
      // In a block the band has the address; a loose flat carries its own.
      {
        titulo: "Piso",
        peso: 1.9,
        valor: (p) =>
          p.bloqueId
            ? (formatUbicacion(p) ?? "Sin ubicar")
            : [p.direccion, formatUbicacion(p)].filter(Boolean).join(" · "),
      },
      { titulo: "Ocupación", peso: 0.9, valor: (p) => ocupacionLabel(p.ocupacion) },
      { titulo: "Captación", peso: 0.8, valor: (p) => captacion(p.captacion) },
      { titulo: "Estado", peso: 0.8, valor: (p) => ESTADO_INMUEBLE_LABELS[p.estado] },
      { titulo: "Propietario", peso: 1.5, valor: (p) => nombre(p.propietario) },
      { titulo: "Teléfono", peso: 1, valor: (p) => p.propietario?.telefono },
      { titulo: "Último contacto", peso: 0.9, valor: (p) => diaMadrid(p.fechaUltimoContacto) },
      { titulo: "Próximo contacto", peso: 0.9, valor: (p) => fechaCorta(p.fechaProximoContacto) },
      { titulo: "Notas", peso: 2.3 },
    ],
    totales: [
      plural(pisos.length, "piso", "pisos"),
      plural(cuantos.size - (cuantos.has("") ? 1 : 0), "bloque", "bloques"),
      plural(pisos.filter((p) => p.captacion === "NOTICIA").length, "noticia", "noticias"),
      plural(pisos.filter((p) => p.captacion === "POTENCIAL").length, "potencial", "potenciales"),
    ].join(" · "),
  });
}

/** The sheet to take to the street: every flat of the block, with room to write. */
export async function pdfHojaBloque(id: string) {
  const ctx = await getContextoApi();
  if (!ctx) return respuestaError(401, "Inicia sesión para sacar el PDF.");
  const { db, oficina } = ctx;

  const bloque = await db.bloque.findUnique({
    where: { id },
    include: {
      zona: { select: { nombre: true } },
      inmuebles: {
        // Same order as the block page: staircase, floor, door.
        orderBy: [
          { escalera: { sort: "asc", nulls: "last" } },
          { planta: { sort: "asc", nulls: "last" } },
          { puerta: { sort: "asc", nulls: "last" } },
        ],
        include: { propietario: { select: { nombre: true, apellidos: true, telefono: true } } },
      },
    },
  });
  if (!bloque) return respuestaError(404, "Este bloque ya no existe.");

  const pisos = bloque.inmuebles;
  const direccion = formatBloque(bloque);
  return respuestaPdf({
    titulo: `Bloque ${direccion}`,
    oficina: oficina.nombre,
    lineas: [
      [bloque.nombre, bloque.localidad, bloque.codigoPostal && `CP ${bloque.codigoPostal}`, `Zona ${bloque.zona.nombre}`]
        .filter(Boolean)
        .join(" · "),
      ...(bloque.notas ? [`Notas del edificio: ${bloque.notas}`] : []),
    ],
    archivo: `bloque-${slug(direccion)}`,
    filas: pisos,
    altoMinimoFila: 26,
    columnas: [
      // Wide enough for «Esc. Izquierda · 1º B» on one line.
      { titulo: "Piso", peso: 1.6, valor: (p) => formatUbicacion(p) ?? "Sin ubicar" },
      { titulo: "Ocupación", peso: 0.9, valor: (p) => ocupacionLabel(p.ocupacion) },
      { titulo: "Captación", peso: 0.9, valor: (p) => captacion(p.captacion) },
      { titulo: "Estado", peso: 0.9, valor: (p) => ESTADO_INMUEBLE_LABELS[p.estado] },
      { titulo: "Propietario", peso: 1.6, valor: (p) => nombre(p.propietario) },
      { titulo: "Teléfono", peso: 1.1, valor: (p) => p.propietario?.telefono },
      { titulo: "Último contacto", peso: 1, valor: (p) => diaMadrid(p.fechaUltimoContacto) },
      { titulo: "Próximo contacto", peso: 1, valor: (p) => fechaCorta(p.fechaProximoContacto) },
      { titulo: "Notas", peso: 2.3 },
    ],
    totales: [
      plural(pisos.length, "piso", "pisos"),
      plural(pisos.filter((p) => p.captacion === "NOTICIA").length, "noticia", "noticias"),
      plural(pisos.filter((p) => p.captacion === "POTENCIAL").length, "potencial", "potenciales"),
    ].join(" · "),
  });
}
