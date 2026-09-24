import "server-only";
import writeXlsxFile, { type Column } from "write-excel-file/node";

import { hoyISO } from "@/lib/filtros/tipos";

/**
 * Excel export of the lists (director only). Always .xlsx, never CSV: text cells
 * starting with «=» stay text, so data typed into the CRM can't become formulas.
 */

export { LIMITE_EXPORTACION } from "@/lib/exportar/limite";

export const FORMATO_FECHA = "dd/mm/yyyy";
export const FORMATO_FECHA_HORA = "dd/mm/yyyy hh:mm";
export const FORMATO_EUROS = '#,##0.00 "€"';

/**
 * Excel has no time zones: a cell shows the Date's UTC fields. Shift a moment
 * so it reads as Spanish wall-clock time.
 */
export function horaMadrid(fecha: Date | null) {
  if (!fecha) return null;
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(fecha)
      .map((p) => [p.type, p.value])
  );
  return new Date(
    Date.UTC(+partes.year, +partes.month - 1, +partes.day, +partes.hour, +partes.minute, +partes.second)
  );
}

/** Header cell style shared by every export. */
export function cabecera(texto: string) {
  return { value: texto, fontWeight: "bold" as const };
}

/** Column helpers: `null`/"" become empty cells. */
export const texto = <T,>(titulo: string, valor: (fila: T) => string | null | undefined, ancho = 18): Column<T> => ({
  header: cabecera(titulo),
  width: ancho,
  cell: (fila) => {
    const v = valor(fila);
    return v ? { value: v, type: String } : null;
  },
});

export const numero = <T,>(titulo: string, valor: (fila: T) => number | null | undefined, ancho = 10, formato?: string): Column<T> => ({
  header: cabecera(titulo),
  width: ancho,
  cell: (fila) => {
    const v = valor(fila);
    return v === null || v === undefined ? null : { value: v, type: Number, ...(formato ? { format: formato } : {}) };
  },
});

export const fecha = <T,>(titulo: string, valor: (fila: T) => Date | null | undefined, conHora = false): Column<T> => ({
  header: cabecera(titulo),
  width: conHora ? 17 : 12,
  cell: (fila) => {
    const v = valor(fila);
    if (!v) return null;
    // Date-only values are stored as UTC midnight and must not shift a day.
    return { value: conHora ? horaMadrid(v)! : v, type: Date, format: conHora ? FORMATO_FECHA_HORA : FORMATO_FECHA };
  },
});

export async function respuestaExcel<T>(filas: T[], columnas: Column<T>[], nombre: string) {
  const buffer = await writeXlsxFile(filas, {
    columns: columnas,
    sheet: nombre.charAt(0).toUpperCase() + nombre.slice(1),
    stickyRowsCount: 1,
  }).toBuffer();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}-${hoyISO()}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

export function respuestaError(estado: 401 | 403 | 413, mensaje: string) {
  return new Response(mensaje, {
    status: estado,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
