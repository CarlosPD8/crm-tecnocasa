import type { DbOficina } from "@/lib/db";
import type {
  AccionActividad,
  CategoriaArchivo,
  EntidadActividad,
  TipoOperacion,
} from "@/lib/generated/prisma/enums";
import type { Bloque, Cliente, Evento, Inmueble, Zona } from "@/lib/generated/prisma/client";
import { hoyISO } from "@/lib/filtros/tipos";
import { formatBloque } from "@/lib/validations/bloque";
import { ordenarEtiquetas, TIPO_CLIENTE_LABELS } from "@/lib/validations/cliente";
import { TIPO_EVENTO_LABELS } from "@/lib/validations/evento";
import { colorZona } from "@/lib/validations/zona";
import { LUGAR_OFICINA, LUGAR_RED } from "@/lib/ubicacion/lugar";
import {
  captacionLabel,
  ESTADO_INMUEBLE_LABELS,
  formatUbicacion,
  ocupacionLabel,
  TIPO_INMUEBLE_LABELS,
  TIPO_OPERACION_LABELS,
} from "@/lib/validations/inmueble";

/**
 * Activity log (the «Actividad» screen, directors only). Every server action
 * that changes data writes one line here, inside the same transaction as the
 * change. The summary is plain text without the author's name, since the
 * screen groups by person. No Next.js imports: the seed uses the phrases too.
 */

export type Cambio = { campo: string; antes: string | null; despues: string | null };

export type NuevaActividad = {
  accion: AccionActividad;
  entidad?: EntidadActividad;
  entidadId?: string;
  /** Page that shows the record, while it exists. */
  enlace?: string | null;
  resumen: string;
  detalle?: string | null;
  cambios?: Cambio[];
};

/** The Spanish calendar day of a moment, as Prisma stores it in a DATE column. */
export function diaDe(fecha: Date) {
  return new Date(`${hoyISO(fecha)}T00:00:00.000Z`);
}

/** Writes one line. Pass the transaction client so it commits with the change. */
export function registrarActividad(db: Pick<DbOficina, "actividad">, a: NuevaActividad, fecha = new Date()) {
  const { cambios, ...resto } = a;
  return db.actividad.create({
    data: { ...resto, fecha, dia: diaDe(fecha), ...(cambios?.length ? { cambios } : {}) },
  });
}

// ─── Formatting (the same in the app, the seed and the initial load) ─────────

/** «198.500 €»: whole euros, always grouped, as the migration's backfill writes them. */
export function euros(valor: number | string | { toString(): string }) {
  const n = Math.round(Number(valor.toString()));
  return `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} €`;
}

/** «16/10/2026» for date-only values (stored as UTC midnight). */
export function fechaCorta(fecha: Date | null) {
  if (!fecha) return null;
  const [y, m, d] = fecha.toISOString().slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const HORA_MADRID = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** «10:05» in Spain. */
export function horaMadrid(fecha: Date) {
  return HORA_MADRID.format(fecha);
}

/** «16/10/2026 10:00» in Spain, or just the day for an all-day event. */
export function cuandoEvento(e: Pick<Evento, "inicio" | "todoElDia">) {
  if (e.todoElDia) return fechaCorta(e.inicio)!;
  const [y, m, d] = hoyISO(e.inicio).split("-");
  return `${d}/${m}/${y} ${horaMadrid(e.inicio)}`;
}

/** «En la oficina», «Desde la red de la oficina», «En Zaidín»: where a line was saved. */
export function textoLugar(lugar: string) {
  if (lugar === LUGAR_OFICINA) return "En la oficina";
  if (lugar === LUGAR_RED) return "Desde la red de la oficina";
  return `En ${lugar}`;
}

function recortar(texto: string | null, max = 80) {
  if (!texto) return null;
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio;
}

/** «precio, estado y descripción». */
function enumerar(partes: string[]) {
  return partes.length < 2 ? partes.join("") : `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}`;
}

const nombreDe = (p: { nombre: string; apellidos: string } | null) => (p ? `${p.nombre} ${p.apellidos}` : null);

// ─── Phrases ─────────────────────────────────────────────────────────────────

export const frase = {
  altaCliente: (nombre: string) => `Dio de alta a ${nombre}`,
  altaInmueble: (referencia: string, direccion: string) => `Dio de alta ${referencia} · ${direccion}`,
  altaBloque: (bloque: string) => `Dio de alta el bloque ${bloque}`,
  altaZona: (nombre: string) => `Creó la zona «${nombre}»`,
  bajaZona: (nombre: string, destino: string, movidos: { bloques: number; pisos: number }) =>
    movidos.bloques + movidos.pisos > 0
      ? `Borró la zona «${nombre}»; sus bloques y pisos pasan a «${destino}»`
      : `Borró la zona «${nombre}»`,
  formaZona: (nombre: string, antes: boolean, despues: boolean) =>
    !despues
      ? `Borró el contorno de la zona «${nombre}»`
      : antes
        ? `Cambió el contorno de la zona «${nombre}»`
        : `Dibujó el contorno de la zona «${nombre}»`,
  controlUbicacion: (activo: boolean) =>
    activo
      ? "Activó el control de ubicación: los asesores solo registran desde sus zonas o la oficina"
      : "Desactivó el control de ubicación",
  oficinaEnMapa: (radioMetros: number, antes: boolean) =>
    `${antes ? "Cambió" : "Marcó"} la oficina en el mapa (radio de ${radioMetros} m)`,
  redOficina: (red: string, quitada = false) =>
    quitada ? `Quitó la red de la oficina ${red}` : `Marcó la red de la oficina (${red})`,
  contacto(con: string | null, sobre: string | null, proximo?: Date | null) {
    const base =
      con && sobre
        ? `Registró un contacto con ${con} sobre ${sobre}`
        : con
          ? `Registró un contacto con ${con}`
          : `Registró un contacto sobre ${sobre}`;
    return proximo ? `${base} · próximo contacto el ${fechaCorta(proximo)}` : base;
  },
  cita: (titulo: string, cuando: string) => `Creó la cita «${titulo}» · ${cuando}`,
  operacion: (tipo: TipoOperacion, referencia: string, precio: number | string | { toString(): string }, cliente: string) =>
    `Cerró ${tipo === "VENTA" ? "la venta" : "el alquiler"} de ${referencia} por ${euros(precio)} con ${cliente}`,
  archivo: (categoria: CategoriaArchivo, nombreArchivo: string, de: string) =>
    categoria === "FOTO" ? `Subió una foto a ${de}` : `Subió el documento «${nombreArchivo}» a ${de}`,
  /**
   * One field: «Cambió el precio de GR-2401: 238.000 € → 232.000 €».
   * Several: «Editó GR-2401: precio, estado y descripción».
   */
  cambio(que: string, cambios: (Cambio & { articulo?: string })[]) {
    if (cambios.length === 1) {
      const [c] = cambios;
      const campo = `${c.articulo ? `${c.articulo} ` : ""}${c.campo.toLowerCase()}`;
      const de = que.startsWith("el ") ? `del ${que.slice(3)}` : `de ${que}`;
      return `Cambió ${campo} ${de}: ${c.antes ?? "—"} → ${c.despues ?? "—"}`;
    }
    return `Editó ${que}: ${enumerar(cambios.map((c) => c.campo.toLowerCase()))}`;
  },
};

// ─── What changed ────────────────────────────────────────────────────────────

/** A field to compare: label, its article (for the sentence) and its value as shown. */
type Campo<T> = [campo: string, articulo: string, valor: (fila: T) => string | null];

function comparar<T>(campos: Campo<T>[], antes: T, despues: T) {
  return campos.flatMap(([campo, articulo, valor]) => {
    const a = valor(antes);
    const d = valor(despues);
    return a === d ? [] : [{ campo, articulo, antes: a, despues: d }];
  });
}

/** Drops the article: what gets stored. */
const guardar = (cambios: (Cambio & { articulo?: string })[]): Cambio[] =>
  cambios.map(({ campo, antes, despues }) => ({ campo, antes, despues }));

const conUnidad = (n: number | null, unidad = "") => (n === null ? null : `${n}${unidad}`);

/** Relations the property diff needs, to name people and blocks instead of ids. */
export const incluirCambiosInmueble = {
  propietario: { select: { nombre: true, apellidos: true } },
  bloque: { select: { calle: true, numero: true } },
  zona: { select: { nombre: true } },
  asesor: { select: { nombre: true } },
} as const;

type InmuebleCambios = Inmueble & {
  propietario: { nombre: string; apellidos: string } | null;
  bloque: { calle: string; numero: string } | null;
  zona: { nombre: string };
  asesor: { nombre: string } | null;
};

const CAMPOS_INMUEBLE: Campo<InmuebleCambios>[] = [
  ["Referencia", "la", (i) => i.referencia],
  ["Dirección", "la", (i) => i.direccion],
  ["Localidad", "la", (i) => i.localidad],
  ["Bloque", "el", (i) => (i.bloque ? formatBloque(i.bloque) : null)],
  ["Zona", "la", (i) => i.zona.nombre],
  ["Escalera, planta y puerta", "la", (i) => formatUbicacion(i)],
  ["Tipo", "el", (i) => TIPO_INMUEBLE_LABELS[i.tipoInmueble]],
  ["Operación", "la", (i) => TIPO_OPERACION_LABELS[i.tipoOperacion]],
  ["Precio", "el", (i) => euros(i.precio)],
  ["Estado", "el", (i) => ESTADO_INMUEBLE_LABELS[i.estado]],
  ["Superficie", "la", (i) => conUnidad(i.metrosCuadrados, " m²")],
  ["Habitaciones", "las", (i) => conUnidad(i.habitaciones)],
  ["Baños", "los", (i) => conUnidad(i.banos)],
  ["Descripción", "la", (i) => recortar(i.descripcion)],
  ["Ocupación", "la", (i) => ocupacionLabel(i.ocupacion)],
  ["Captación", "la", (i) => captacionLabel(i.captacion)],
  ["Fin del alquiler", "el", (i) => fechaCorta(i.fechaFinAlquiler)],
  ["Próximo contacto", "el", (i) => fechaCorta(i.fechaProximoContacto)],
  ["Propietario", "el", (i) => nombreDe(i.propietario)],
  ["Asesor responsable", "el", (i) => i.asesor?.nombre ?? null],
];

/** The log line for an edited property, or null when nothing changed. */
export function cambioInmueble(antes: InmuebleCambios, despues: InmuebleCambios): NuevaActividad | null {
  const cambios = comparar(CAMPOS_INMUEBLE, antes, despues);
  if (!cambios.length) return null;
  const ref = despues.referencia;
  const soloEstado = cambios.length === 1 && cambios[0].campo === "Estado";
  return {
    accion: "CAMBIO",
    entidad: "INMUEBLE",
    entidadId: despues.id,
    enlace: `/inmuebles/${despues.id}`,
    resumen: soloEstado ? `Pasó ${ref} a ${cambios[0].despues}` : frase.cambio(ref, cambios),
    cambios: guardar(cambios),
  };
}

export const incluirCambiosCliente = { asesor: { select: { nombre: true } } } as const;

type ClienteCambios = Cliente & { asesor: { nombre: string } | null };

const CAMPOS_CLIENTE: Campo<ClienteCambios>[] = [
  ["Nombre", "el", (c) => `${c.nombre} ${c.apellidos}`],
  ["DNI / NIE", "el", (c) => c.dni],
  ["Teléfono", "el", (c) => c.telefono],
  ["Email", "el", (c) => c.email],
  ["Dirección", "la", (c) => c.direccion],
  ["Etiquetas", "las", (c) => ordenarEtiquetas(c.tipos).map((t) => TIPO_CLIENTE_LABELS[t]).join(", ") || null],
  ["Notas", "las", (c) => recortar(c.notas)],
  ["Próximo contacto", "el", (c) => fechaCorta(c.fechaProximoContacto)],
  ["Asesor responsable", "el", (c) => c.asesor?.nombre ?? null],
];

export function cambioCliente(antes: ClienteCambios, despues: ClienteCambios): NuevaActividad | null {
  const cambios = comparar(CAMPOS_CLIENTE, antes, despues);
  if (!cambios.length) return null;
  return {
    accion: "CAMBIO",
    entidad: "CLIENTE",
    entidadId: despues.id,
    enlace: `/clientes/${despues.id}`,
    resumen: frase.cambio(`${despues.nombre} ${despues.apellidos}`, cambios),
    cambios: guardar(cambios),
  };
}

export const incluirCambiosBloque = { zona: { select: { nombre: true } } } as const;

type BloqueCambios = Bloque & { zona: { nombre: string } };

const CAMPOS_BLOQUE: Campo<BloqueCambios>[] = [
  ["Calle y número", "la", (b) => formatBloque(b)],
  ["Localidad", "la", (b) => b.localidad],
  ["Nombre", "el", (b) => b.nombre],
  ["Código postal", "el", (b) => b.codigoPostal],
  ["Zona", "la", (b) => b.zona.nombre],
  ["Notas", "las", (b) => recortar(b.notas)],
];

/** `pisos`: how many flats the block has; they follow it when its zone changes. */
export function cambioBloque(antes: BloqueCambios, despues: BloqueCambios, pisos = 0): NuevaActividad | null {
  const cambios = comparar(CAMPOS_BLOQUE, antes, despues);
  if (!cambios.length) return null;
  const arrastre =
    antes.zonaId !== despues.zonaId && pisos > 0
      ? ` · ${pisos === 1 ? "su piso pasa" : `sus ${pisos} pisos pasan`} también a «${despues.zona.nombre}»`
      : "";
  return {
    accion: "CAMBIO",
    entidad: "BLOQUE",
    entidadId: despues.id,
    enlace: `/bloques/${despues.id}`,
    resumen: frase.cambio(`el bloque ${formatBloque(despues)}`, cambios) + arrastre,
    cambios: guardar(cambios),
  };
}

export const incluirCambiosZona = {
  asesores: { select: { usuario: { select: { nombre: true } } } },
} as const;

type ZonaCambios = Zona & { asesores: { usuario: { nombre: string } }[] };

/** «Ana, Bea»: the advisors of a zone, by name. */
export function nombresAsesores(z: { asesores: { usuario: { nombre: string } }[] }) {
  return (
    z.asesores
      .map((a) => a.usuario.nombre)
      .sort((a, b) => a.localeCompare(b, "es"))
      .join(", ") || null
  );
}

const CAMPOS_ZONA: Campo<ZonaCambios>[] = [
  ["Nombre", "el", (z) => z.nombre],
  ["Color", "el", (z) => colorZona(z.color).label],
  ["Notas", "las", (z) => recortar(z.notas)],
  ["Asesores", "los", nombresAsesores],
];

export function cambioZona(antes: ZonaCambios, despues: ZonaCambios): NuevaActividad | null {
  const cambios = comparar(CAMPOS_ZONA, antes, despues);
  if (!cambios.length) return null;
  return {
    accion: "CAMBIO",
    entidad: "ZONA",
    entidadId: despues.id,
    enlace: "/zonas",
    resumen: frase.cambio(`la zona «${despues.nombre}»`, cambios),
    cambios: guardar(cambios),
  };
}

type EventoCambios = Evento & {
  cliente: { nombre: string; apellidos: string } | null;
  inmueble: { referencia: string } | null;
};

const CAMPOS_EVENTO: Campo<EventoCambios>[] = [
  ["Título", "el", (e) => e.titulo],
  ["Tipo", "el", (e) => TIPO_EVENTO_LABELS[e.tipo]],
  ["Fecha", "la", (e) => cuandoEvento(e)],
  ["Cliente", "el", (e) => nombreDe(e.cliente)],
  ["Inmueble", "el", (e) => e.inmueble?.referencia ?? null],
  ["Notas", "las", (e) => recortar(e.notas)],
];

export function cambioEvento(antes: EventoCambios, despues: EventoCambios): NuevaActividad | null {
  const cambios = comparar(CAMPOS_EVENTO, antes, despues);
  if (!cambios.length) return null;
  return {
    accion: "CAMBIO",
    entidad: "EVENTO",
    entidadId: despues.id,
    enlace: "/calendario",
    resumen: frase.cambio(`la cita «${despues.titulo}»`, cambios),
    cambios: guardar(cambios),
  };
}
