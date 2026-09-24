/**
 * Declarative filter engine. Each list (clientes, inmuebles, bloques) declares
 * its fields once; the same declaration drives the filter panel, the active
 * filter chips and the database query.
 *
 * Every field lives in the URL as a single search param, so filtered views can
 * be bookmarked and shared:
 *   multi  → "A,B"            (any of)
 *   rango  → "min~max"        (either side may be empty)
 *   fecha  → "desde~hasta" (yyyy-MM-dd, inclusive) | "p:<preset>"
 *   bool   → "1" | "0"
 *   texto  → free text (contains, case-insensitive)
 */

type Base = {
  clave: string;
  etiqueta: string;
  grupo: string;
};

export type CampoMulti = Base & {
  tipo: "multi";
  /** Fixed options, or filled at runtime from the database (e.g. localities). */
  opciones: Record<string, string> | "dinamico";
};

export type CampoRango = Base & {
  tipo: "rango";
  sufijo?: string;
  /** Only whole numbers make sense (rooms, floor…). */
  entero?: boolean;
};

export type CampoFecha = Base & {
  tipo: "fecha";
  presets: PresetFecha[];
};

export type CampoBool = Base & {
  tipo: "bool";
  si?: string;
  no?: string;
};

export type CampoTexto = Base & {
  tipo: "texto";
  placeholder?: string;
};

export type Campo = CampoMulti | CampoRango | CampoFecha | CampoBool | CampoTexto;

export type DefinicionFiltros = {
  campos: Campo[];
  /** Sort options; the first one is the default. */
  orden: Record<string, string>;
};

export const PRESETS_FECHA = {
  vencido: "Vencido u hoy",
  hoy: "Hoy",
  proximos7: "Próximos 7 días",
  proximos30: "Próximos 30 días",
  proximos90: "Próximos 90 días",
  pasados: "Ya pasada",
  ultimos7: "Últimos 7 días",
  ultimos30: "Últimos 30 días",
  esteMes: "Este mes",
  mas30: "Hace más de 30 días",
  mas90: "Hace más de 90 días",
  sin: "Sin fecha",
} as const;

export type PresetFecha = keyof typeof PRESETS_FECHA;

// ─── Parsing (shared by server and client) ──────────────────────────────────

export function leerMulti(valor: string | undefined, permitidos?: string[]) {
  if (!valor) return [];
  const lista = valor.split(",").map((v) => v.trim()).filter(Boolean);
  return permitidos ? lista.filter((v) => permitidos.includes(v)) : lista;
}

export function leerRango(valor: string | undefined) {
  if (!valor) return null;
  const [a, b] = valor.split("~");
  const num = (s: string | undefined) => {
    if (s === undefined || s.trim() === "") return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  };
  const min = num(a);
  const max = num(b);
  return min === undefined && max === undefined ? null : { min, max };
}

export function leerBool(valor: string | undefined) {
  return valor === "1" ? true : valor === "0" ? false : null;
}

const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in Spain, so "today" doesn't depend on the server's time zone. */
export function hoyISO(ahora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(ahora);
}

function sumarDias(dia: string, dias: number) {
  const d = new Date(`${dia}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export type RangoFecha =
  | { sin: true }
  | { sin?: false; desde?: string; hasta?: string };

/** Resolves a date value (explicit range or relative preset) into inclusive days. */
export function leerFecha(valor: string | undefined, ahora = new Date()): RangoFecha | null {
  if (!valor) return null;
  if (valor.startsWith("p:")) {
    const hoy = hoyISO(ahora);
    switch (valor.slice(2) as PresetFecha) {
      case "sin":
        return { sin: true };
      case "vencido":
        return { hasta: hoy };
      case "hoy":
        return { desde: hoy, hasta: hoy };
      case "proximos7":
        return { desde: hoy, hasta: sumarDias(hoy, 7) };
      case "proximos30":
        return { desde: hoy, hasta: sumarDias(hoy, 30) };
      case "proximos90":
        return { desde: hoy, hasta: sumarDias(hoy, 90) };
      case "pasados":
        return { hasta: sumarDias(hoy, -1) };
      case "ultimos7":
        return { desde: sumarDias(hoy, -7), hasta: hoy };
      case "ultimos30":
        return { desde: sumarDias(hoy, -30), hasta: hoy };
      case "esteMes": {
        const inicio = `${hoy.slice(0, 8)}01`;
        const d = new Date(`${inicio}T00:00:00.000Z`);
        d.setUTCMonth(d.getUTCMonth() + 1);
        d.setUTCDate(0);
        return { desde: inicio, hasta: d.toISOString().slice(0, 10) };
      }
      case "mas30":
        return { hasta: sumarDias(hoy, -31) };
      case "mas90":
        return { hasta: sumarDias(hoy, -91) };
      default:
        return null;
    }
  }
  const [desde, hasta] = valor.split("~");
  const ok = (s: string | undefined) => (s && DIA_RE.test(s) ? s : undefined);
  const r = { desde: ok(desde), hasta: ok(hasta) };
  return r.desde || r.hasta ? r : null;
}

/** Inclusive day range → Prisma DateTime condition (days as UTC midnights). */
export function condicionFecha(r: RangoFecha) {
  if (r.sin) return null;
  return {
    ...(r.desde ? { gte: new Date(`${r.desde}T00:00:00.000Z`) } : {}),
    ...(r.hasta ? { lt: new Date(`${sumarDias(r.hasta, 1)}T00:00:00.000Z`) } : {}),
  };
}

// ─── Human-readable summary for the active-filter chips ─────────────────────

const numero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

function fechaCorta(dia: string) {
  const [y, m, d] = dia.split("-");
  return `${d}/${m}/${y}`;
}

export function describirValor(
  campo: Campo,
  valor: string,
  opcionesDinamicas?: Record<string, string>
): string | null {
  switch (campo.tipo) {
    case "multi": {
      const opciones = campo.opciones === "dinamico" ? opcionesDinamicas ?? {} : campo.opciones;
      const lista = leerMulti(valor);
      if (!lista.length) return null;
      return lista.map((v) => opciones[v] ?? v).join(", ");
    }
    case "rango": {
      const r = leerRango(valor);
      if (!r) return null;
      const f = (n: number) => `${numero.format(n)}${campo.sufijo ? ` ${campo.sufijo}` : ""}`;
      if (r.min !== undefined && r.max !== undefined) {
        return r.min === r.max ? f(r.min) : `${numero.format(r.min)} – ${f(r.max)}`;
      }
      return r.min !== undefined ? `desde ${f(r.min)}` : `hasta ${f(r.max!)}`;
    }
    case "fecha": {
      if (valor.startsWith("p:")) return PRESETS_FECHA[valor.slice(2) as PresetFecha] ?? null;
      const r = leerFecha(valor);
      if (!r || r.sin) return null;
      if (r.desde && r.hasta) return `${fechaCorta(r.desde)} – ${fechaCorta(r.hasta)}`;
      return r.desde ? `desde ${fechaCorta(r.desde)}` : `hasta ${fechaCorta(r.hasta!)}`;
    }
    case "bool": {
      const b = leerBool(valor);
      return b === null ? null : b ? campo.si ?? "Sí" : campo.no ?? "No";
    }
    case "texto":
      return valor.trim() ? `«${valor.trim()}»` : null;
  }
}
