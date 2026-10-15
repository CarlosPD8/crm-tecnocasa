import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { hoyISO } from "@/lib/filtros/tipos";
import { horaMadrid } from "@/lib/actividad";

/**
 * Landscape A4 table, «like an invoice»: title and filters on top, the header
 * row repeated on every page, totals at the end and «Página 2 de 5» below.
 * pdf-lib is plain JavaScript with the standard fonts built in, so it runs in
 * any serverless function without a browser or font files.
 */

export type ColumnaPdf<T> = {
  titulo: string;
  /** Relative width: the columns share the page in proportion. */
  peso: number;
  valor?: (fila: T) => string | null | undefined;
  derecha?: boolean;
};

export type DocumentoPdf<T> = {
  titulo: string;
  oficina: string;
  /** Extra lines under the title: filters applied, building notes… */
  lineas?: string[];
  columnas: ColumnaPdf<T>[];
  filas: T[];
  totales?: string;
  /** Taller rows leave room to write by hand (the block sheet). */
  altoMinimoFila?: number;
  archivo: string;
};

const ANCHO = 841.89;
const ALTO = 595.28;
const MARGEN = 36;
const PIE = 28;
const RELLENO = 4;
const TAM = 8.5;
const INTERLINEA = 10.5;

const VERDE = rgb(0.024, 0.306, 0.231); // #064e3b, the brand green
const TINTA = rgb(0.16, 0.15, 0.13);
const GRIS = rgb(0.45, 0.42, 0.38);
const LINEA = rgb(0.86, 0.83, 0.78);
const CABECERA = rgb(0.973, 0.906, 0.788); // #f8e7c9
const CEBRA = rgb(0.985, 0.975, 0.958);

/** The standard fonts only cover WinAnsi: anything else (emoji…) becomes «?». */
function limpiador(fuente: PDFFont) {
  const admitidos = new Set(fuente.getCharacterSet());
  return (texto: string) =>
    [...texto.replace(/[\r\n\t]+/g, " ").replace(/[  ]/g, " ")]
      .map((c) => (admitidos.has(c.codePointAt(0)!) ? c : "?"))
      .join("");
}

/** Splits text into lines that fit `ancho`, breaking long words if needed. */
function partir(texto: string, fuente: PDFFont, tam: number, ancho: number) {
  const cabe = (s: string) => fuente.widthOfTextAtSize(s, tam) <= ancho;
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (cabe(candidata)) {
      actual = candidata;
      continue;
    }
    if (actual) lineas.push(actual);
    actual = "";
    let resto = palabra;
    while (!cabe(resto)) {
      let corte = resto.length - 1;
      while (corte > 1 && !cabe(resto.slice(0, corte))) corte--;
      lineas.push(resto.slice(0, corte));
      resto = resto.slice(corte);
    }
    actual = resto;
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [""];
}

/** «14/10/2026 22:58» in Spain. */
function ahoraMadrid(ahora: Date) {
  const [y, m, d] = hoyISO(ahora).split("-");
  return `${d}/${m}/${y} ${horaMadrid(ahora)}`;
}

export async function generarPdf<T>(doc: DocumentoPdf<T>) {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const limpio = limpiador(normal);
  const ahora = new Date();

  pdf.setTitle(doc.titulo);
  pdf.setCreator("Picaco");
  pdf.setProducer("Picaco");

  const anchoUtil = ANCHO - 2 * MARGEN;
  const sumaPesos = doc.columnas.reduce((s, c) => s + c.peso, 0);
  const anchos = doc.columnas.map((c) => (anchoUtil * c.peso) / sumaPesos);

  let pagina: PDFPage;
  let y = 0;

  const texto = (p: PDFPage, s: string, x: number, yy: number, fuente: PDFFont, tam: number, color = TINTA) =>
    p.drawText(limpio(s), { x, y: yy, size: tam, font: fuente, color });

  function filaDeCeldas(valores: string[], fuente: PDFFont) {
    const lineas = valores.map((v, i) => partir(limpio(v), fuente, TAM, anchos[i] - 2 * RELLENO));
    const alto = Math.max(doc.altoMinimoFila ?? 0, Math.max(...lineas.map((l) => l.length)) * INTERLINEA + 2 * RELLENO);
    return { lineas, alto };
  }

  function dibujarCeldas(lineas: string[][], alto: number, fuente: PDFFont, color = TINTA) {
    let x = MARGEN;
    lineas.forEach((ls, i) => {
      ls.forEach((linea, n) => {
        const ancho = fuente.widthOfTextAtSize(linea, TAM);
        const xx = doc.columnas[i].derecha ? x + anchos[i] - RELLENO - ancho : x + RELLENO;
        pagina.drawText(linea, { x: xx, y: y - RELLENO - TAM - n * INTERLINEA + 1.5, size: TAM, font: fuente, color });
      });
      x += anchos[i];
    });
    y -= alto;
  }

  const cabecera = filaDeCeldas(doc.columnas.map((c) => c.titulo), negrita);

  function nuevaPagina(primera: boolean) {
    pagina = pdf.addPage([ANCHO, ALTO]);
    y = ALTO - MARGEN;
    if (primera) {
      texto(pagina, doc.titulo, MARGEN, y - 15, negrita, 15, VERDE);
      y -= 24;
      texto(pagina, `Oficina ${doc.oficina} · ${ahoraMadrid(ahora)}`, MARGEN, y - 9, normal, 9, GRIS);
      y -= 14;
      for (const linea of doc.lineas ?? []) {
        for (const parte of partir(limpio(linea), normal, 9, anchoUtil)) {
          texto(pagina, parte, MARGEN, y - 9, normal, 9, GRIS);
          y -= 12;
        }
      }
      y -= 8;
    } else {
      texto(pagina, `${doc.titulo} (continuación)`, MARGEN, y - 9, negrita, 9, VERDE);
      y -= 18;
    }
    pagina.drawRectangle({ x: MARGEN, y: y - cabecera.alto, width: anchoUtil, height: cabecera.alto, color: CABECERA });
    dibujarCeldas(cabecera.lineas, cabecera.alto, negrita, VERDE);
  }

  nuevaPagina(true);
  doc.filas.forEach((fila, n) => {
    const { lineas, alto } = filaDeCeldas(doc.columnas.map((c) => c.valor?.(fila) ?? ""), normal);
    if (y - alto < MARGEN + PIE) nuevaPagina(false);
    if (n % 2 === 1) pagina.drawRectangle({ x: MARGEN, y: y - alto, width: anchoUtil, height: alto, color: CEBRA });
    pagina.drawLine({ start: { x: MARGEN, y: y - alto }, end: { x: ANCHO - MARGEN, y: y - alto }, thickness: 0.5, color: LINEA });
    dibujarCeldas(lineas, alto, normal);
  });

  if (doc.totales) {
    if (y - 22 < MARGEN + PIE) nuevaPagina(false);
    texto(pagina!, doc.totales, MARGEN + RELLENO, y - 16, negrita, 9, VERDE);
  }

  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    texto(p, `Picaco · Oficina ${doc.oficina} · ${ahoraMadrid(ahora)}`, MARGEN, MARGEN - 12, normal, 7.5, GRIS);
    const numero = `Página ${i + 1} de ${paginas.length}`;
    texto(p, numero, ANCHO - MARGEN - normal.widthOfTextAtSize(numero, 7.5), MARGEN - 12, normal, 7.5, GRIS);
  });

  return pdf.save();
}

/** Opens in the browser's PDF viewer, from where it can be printed or saved. */
export async function respuestaPdf<T>(doc: DocumentoPdf<T>) {
  const bytes = await generarPdf(doc);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.archivo}-${hoyISO()}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
