import Link from "next/link";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { horaMadrid, type Cambio } from "@/lib/actividad";
import type { AccionActividad, EntidadActividad } from "@/lib/generated/prisma/enums";

export type FilaActividad = {
  id: string;
  fecha: Date;
  accion: AccionActividad;
  entidad: EntidadActividad | null;
  enlace: string | null;
  resumen: string;
  detalle: string | null;
  cambios: unknown;
};

export type PersonaActividad = { id: string; nombre: string; esDirector: boolean };

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

const ALTAS: Partial<Record<EntidadActividad, [string, string]>> = {
  CLIENTE: ["cliente nuevo", "clientes nuevos"],
  INMUEBLE: ["inmueble nuevo", "inmuebles nuevos"],
  BLOQUE: ["bloque nuevo", "bloques nuevos"],
  EVENTO: ["cita", "citas"],
  ARCHIVO: ["archivo", "archivos"],
  INTERES: ["interesado", "interesados"],
  USUARIO: ["alta en el equipo", "altas en el equipo"],
  ZONA: ["zona nueva", "zonas nuevas"],
};

/** «12 contactos · 2 inmuebles nuevos · 3 cambios»: what a director scans first. */
function resumenDelDia(filas: FilaActividad[]) {
  const cuenta = (pred: (f: FilaActividad) => boolean) => filas.filter(pred).length;
  const partes: string[] = [];
  const contactos = cuenta((f) => f.accion === "CONTACTO");
  if (contactos) partes.push(plural(contactos, "contacto", "contactos"));
  for (const [entidad, [uno, varios]] of Object.entries(ALTAS) as [EntidadActividad, [string, string]][]) {
    const n = cuenta((f) => f.accion === "ALTA" && f.entidad === entidad);
    if (n) partes.push(plural(n, uno, varios));
  }
  const operaciones = cuenta((f) => f.accion === "OPERACION");
  if (operaciones) partes.push(plural(operaciones, "operación cerrada", "operaciones cerradas"));
  const cambios = cuenta((f) => f.accion === "CAMBIO");
  if (cambios) partes.push(plural(cambios, "cambio", "cambios"));
  const bajas = cuenta((f) => f.accion === "BAJA");
  if (bajas) partes.push(plural(bajas, "borrado", "borrados"));
  return partes;
}

function leerCambios(valor: unknown): Cambio[] {
  return Array.isArray(valor) ? (valor as Cambio[]) : [];
}

function iniciales(nombre: string) {
  const [a = "", b = ""] = nombre.trim().split(/\s+/);
  return `${a[0] ?? ""}${b[0] ?? ""}`.toUpperCase();
}

/** «Hoy», «Ayer» or «Lunes 12 de octubre». */
export function nombreDia(dia: string, hoy: string, ayer: string) {
  if (dia === hoy) return "Hoy";
  if (dia === ayer) return "Ayer";
  const texto = format(parseISO(dia), "EEEE d 'de' MMMM", { locale: es });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * One day of the office: a row per person with the day's summary, opening onto
 * the timeline of what they did. Visits to the app are counted in the summary
 * and shown muted in the timeline.
 */
export function DiaActividad({
  titulo,
  subtitulo,
  porPersona,
  personas,
  sinActividad,
  vigentes,
}: {
  titulo: string;
  /** The full date under «Hoy» and «Ayer». */
  subtitulo?: string;
  porPersona: Map<string, FilaActividad[]>;
  personas: Map<string, PersonaActividad>;
  /** Active people with nothing that day (only when it makes sense to say so). */
  sinActividad: PersonaActividad[];
  /** Links whose record still exists. */
  vigentes: Set<string>;
}) {
  const grupos = [...porPersona.entries()].sort(
    ([, a], [, b]) =>
      b.filter((f) => f.accion !== "ENTRADA").length - a.filter((f) => f.accion !== "ENTRADA").length
  );
  const acciones = grupos.reduce((n, [, filas]) => n + filas.filter((f) => f.accion !== "ENTRADA").length, 0);

  return (
    <section className="rise overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-foreground/6">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border/70 px-5 py-3.5">
        <h2 className="flex items-baseline gap-2">
          <span className="font-display text-2xl leading-none">{titulo}</span>
          {subtitulo && <span className="text-xs text-muted-foreground">{subtitulo}</span>}
        </h2>
        <p className="text-xs text-muted-foreground">
          {plural(grupos.length, "persona", "personas")} · {plural(acciones, "acción", "acciones")}
        </p>
      </header>

      <div className="flex flex-col divide-y divide-border/60">
        {grupos.map(([personaId, filas]) => {
          const persona = personas.get(personaId) ?? { id: personaId, nombre: "Usuario eliminado", esDirector: false };
          const entradas = filas.filter((f) => f.accion === "ENTRADA");
          const resumen = resumenDelDia(filas);
          const primera = filas[0].fecha;
          const ultima = filas[filas.length - 1].fecha;
          return (
            <details key={personaId} open={grupos.length === 1} className="group/persona">
              <summary className="flex cursor-pointer list-none items-start gap-3.5 px-5 py-3.5 transition-colors duration-150 hover:bg-surface/70 focus-visible:bg-surface focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                <span className="grid size-8 shrink-0 place-items-center rounded-[30%] bg-secondary text-xs font-semibold text-secondary-foreground">
                  {iniciales(persona.nombre)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{persona.nombre}</span>
                    {persona.esDirector && <span className="text-xs text-muted-foreground">Director</span>}
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {entradas.length > 0 && (
                      <span className="rounded-md bg-accent px-1.5 py-0.5 text-xs font-medium text-accent-foreground">
                        {plural(entradas.length, "entrada", "entradas")} · la primera a las {horaMadrid(entradas[0].fecha)}
                      </span>
                    )}
                    {resumen.map((parte) => (
                      <span key={parte} className="rounded-md bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                        {parte}
                      </span>
                    ))}
                    {resumen.length === 0 && entradas.length > 0 && (
                      <span className="px-0.5 py-0.5 text-xs text-muted-foreground">Sin cambios en los datos</span>
                    )}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 pt-1.5 text-xs text-muted-foreground">
                  <span className="tabular hidden sm:inline">
                    {horaMadrid(primera)}
                    {ultima.getTime() !== primera.getTime() && ` – ${horaMadrid(ultima)}`}
                  </span>
                  <ChevronDown className="size-4 transition-transform duration-200 group-open/persona:rotate-180" />
                </span>
              </summary>

              <ol className="flex flex-col gap-3 border-t border-border/50 bg-surface/40 px-5 py-4 sm:pl-17">
                {filas.map((f) => (
                  <Linea key={f.id} fila={f} vigente={!!f.enlace && vigentes.has(f.enlace)} />
                ))}
              </ol>
            </details>
          );
        })}
      </div>

      {sinActividad.length > 0 && (
        <p className="border-t border-border/70 px-5 py-3 text-xs text-muted-foreground">
          Sin actividad: {sinActividad.map((p) => p.nombre).join(", ")}
        </p>
      )}
    </section>
  );
}

function Linea({ fila, vigente }: { fila: FilaActividad; vigente: boolean }) {
  const cambios = leerCambios(fila.cambios);
  const entrada = fila.accion === "ENTRADA";
  return (
    <li className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 text-sm">
      <time dateTime={fila.fecha.toISOString()} className="tabular pt-px text-xs text-muted-foreground">
        {horaMadrid(fila.fecha)}
      </time>
      <div className="flex min-w-0 flex-col gap-1">
        <p className={cn(entrada && "text-muted-foreground", fila.accion === "BAJA" && "text-destructive")}>
          {vigente ? (
            <Link href={fila.enlace!} className="underline-offset-4 hover:text-primary hover:underline">
              {fila.resumen}
            </Link>
          ) : (
            fila.resumen
          )}
        </p>
        {cambios.length > 1 && (
          <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            {cambios.map((c) => (
              <li key={c.campo}>
                <span className="font-medium text-foreground">{c.campo}:</span> {c.antes ?? "—"} → {c.despues ?? "—"}
              </li>
            ))}
          </ul>
        )}
        {fila.detalle && (
          <p className="line-clamp-3 max-w-[70ch] text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {fila.detalle}
          </p>
        )}
      </div>
    </li>
  );
}
