"use client";

import { useCallback, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import esLocale from "@fullcalendar/core/locales/es";
import type {
  EventApi,
  EventContentArg,
  EventDropArg,
  EventInput,
  EventSourceFuncArg,
} from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { addDays, addHours, format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, Handshake, KeyRound, LoaderCircle, Phone, Plus } from "lucide-react";
import { toast } from "sonner";

import { moverEvento, moverProximoContacto, obtenerCalendario } from "@/lib/actions/eventos";
import { FUENTE_LABELS, type FuenteCalendario, type ItemCalendario } from "@/lib/validations/evento";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { borradorDesdeFechas, EventoDialog, type BorradorEvento } from "@/components/calendario/evento-dialog";
import { DetalleDialog } from "@/components/calendario/detalle-dialog";

const VISTAS = {
  dayGridMonth: "Mes",
  timeGridWeek: "Semana",
  timeGridDay: "Día",
  listWeek: "Agenda",
} as const;
type Vista = keyof typeof VISTAS;

const FUENTES = Object.keys(FUENTE_LABELS) as FuenteCalendario[];

function aEventoFC(item: ItemCalendario): EventInput {
  const esEvento = item.fuente === "evento";
  return {
    id: `${item.fuente}:${item.id}`,
    title: item.titulo,
    start: item.inicio,
    end: item.fin ?? undefined,
    allDay: item.todoElDia,
    // Own events move and stretch; a follow-up only moves (it is a date);
    // logged contacts and closed deals are history and stay put.
    startEditable: esEvento || item.fuente === "proximo",
    durationEditable: esEvento,
    display: item.fuente === "contacto" ? "list-item" : "block",
    classNames: ["ev", `ev-${item.fuente}`, item.tipo ? `ev-${item.tipo.toLowerCase()}` : ""],
    extendedProps: { item },
  };
}

function ContenidoEvento({ event, timeText }: EventContentArg) {
  // The selection preview («mirror») is a bare event without CRM data.
  const item = event.extendedProps.item as ItemCalendario | undefined;
  const Icono = item ? { proximo: Phone, contacto: Check, operacion: Handshake, finAlquiler: KeyRound, evento: null }[item.fuente] : null;
  return (
    <span className="ev-contenido">
      {Icono && <Icono aria-hidden className="ev-icono" />}
      {timeText && <span className="ev-hora">{timeText}</span>}
      <span className="ev-titulo">{event.title}</span>
    </span>
  );
}

export default function Calendario() {
  const ref = useRef<FullCalendar>(null);
  const [titulo, setTitulo] = useState("");
  const [vista, setVista] = useState<Vista>(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? "listWeek" : "dayGridMonth"
  );
  const [fuentes, setFuentes] = useState<Set<FuenteCalendario>>(() => new Set(FUENTES));
  const fuentesRef = useRef(fuentes);
  const [cargando, setCargando] = useState(false);
  const [borrador, setBorrador] = useState<BorradorEvento | null>(null);
  const [detalle, setDetalle] = useState<ItemCalendario | null>(null);

  const api = () => ref.current?.getApi();

  const cargarEventos = useCallback(
    async (info: EventSourceFuncArg): Promise<EventInput[]> => {
      try {
        const items = await obtenerCalendario(info.start.toISOString(), info.end.toISOString());
        return items.filter((i) => fuentesRef.current.has(i.fuente)).map(aEventoFC);
      } catch {
        toast.error("No se pudo cargar el calendario. Revisa la conexión.");
        return [];
      }
    },
    []
  );

  function alternarFuente(fuente: FuenteCalendario) {
    const siguiente = new Set(fuentes);
    if (siguiente.has(fuente)) siguiente.delete(fuente);
    else siguiente.add(fuente);
    fuentesRef.current = siguiente;
    setFuentes(siguiente);
    api()?.refetchEvents();
  }

  function cambiarVista(v: Vista) {
    setVista(v);
    api()?.changeView(v);
  }

  function nuevoEvento() {
    const ahora = new Date();
    const inicio = new Date(ahora);
    inicio.setHours(ahora.getHours() + 1, 0, 0, 0);
    setBorrador(borradorDesdeFechas(inicio, addHours(inicio, 1), false));
  }

  function borradorDeEvento(event: EventApi): BorradorEvento {
    const item = event.extendedProps.item as ItemCalendario;
    return borradorDesdeFechas(event.start!, event.end, event.allDay, {
      id: item.id,
      titulo: item.titulo,
      tipo: item.tipo ?? "OTRO",
      notas: item.notas ?? "",
      cliente: item.cliente ? { id: item.cliente.id, label: item.cliente.nombre } : null,
      inmueble: item.inmueble ? { id: item.inmueble.id, label: item.inmueble.referencia } : null,
      autor: item.autor,
      puedeEliminar: item.puedeEliminar,
    });
  }

  async function guardarFechas(info: EventDropArg | EventResizeDoneArg) {
    const { event } = info;
    const item = event.extendedProps.item as ItemCalendario;
    const inicio = event.start!;
    const cuando = format(inicio, event.allDay ? "EEEE d 'de' MMMM" : "EEEE d 'de' MMMM, HH:mm", { locale: es });

    try {
      if (item.fuente === "proximo") {
        if (!event.allDay) {
          info.revert();
          toast.info("Un próximo contacto es para todo el día: suéltalo en la fila «Todo el día» o en la vista Mes.");
          return;
        }
        const r = await moverProximoContacto(item.id, format(inicio, "yyyy-MM-dd"));
        if (!r.success) throw new Error(r.error);
        toast.success(`Próximo contacto movido al ${cuando}.`);
        return;
      }

      const r = await moverEvento(
        item.id,
        event.allDay
          ? {
              todoElDia: true,
              inicio: format(inicio, "yyyy-MM-dd"),
              fin: format(event.end ?? addDays(inicio, 1), "yyyy-MM-dd"),
            }
          : {
              todoElDia: false,
              inicio: inicio.toISOString(),
              fin: (event.end ?? addHours(inicio, 1)).toISOString(),
            }
      );
      if (!r.success) throw new Error(r.error);
      // Resizing reports endDelta; dropping reports delta.
      toast.success("endDelta" in info ? "Duración actualizada." : `Movido al ${cuando}.`);
    } catch {
      info.revert();
      toast.error("No se pudo guardar el cambio. Se ha deshecho.");
    }
  }

  return (
    <div className="rise flex flex-col gap-4 [animation-delay:60ms]">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-card p-0.5 shadow-soft ring-1 ring-foreground/6">
            <Button variant="ghost" size="icon-sm" aria-label="Anterior" onClick={() => api()?.prev()}>
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => api()?.today()}>
              Hoy
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Siguiente" onClick={() => api()?.next()}>
              <ChevronRight />
            </Button>
          </div>
          <h2 className="font-display text-2xl leading-none first-letter:uppercase sm:text-3xl" aria-live="polite">
            {titulo}
          </h2>
          <LoaderCircle
            aria-hidden
            className={cn(
              "size-4 animate-spin text-muted-foreground transition-opacity duration-200",
              cargando ? "opacity-100" : "opacity-0"
            )}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="radiogroup"
            aria-label="Vista"
            className="flex rounded-lg border border-input bg-surface/70 p-0.5"
          >
            {(Object.entries(VISTAS) as [Vista, string][]).map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={vista === v}
                onClick={() => cambiarVista(v)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-[background-color,color,box-shadow] duration-200 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
                  vista === v && "bg-card text-foreground shadow-soft ring-1 ring-foreground/6"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Button onClick={nuevoEvento}>
            <Plus /> Nuevo evento
          </Button>
        </div>
      </div>

      {/* Source filters double as the legend. */}
      <div className="flex flex-wrap items-center gap-1.5" aria-label="Mostrar en el calendario">
        {FUENTES.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={fuentes.has(f)}
            onClick={() => alternarFuente(f)}
            className={cn(
              "leyenda inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-[background-color,color,border-color,opacity] duration-200 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
              `leyenda-${f}`,
              fuentes.has(f)
                ? "border-border bg-card text-foreground shadow-soft"
                : "border-dashed border-border text-muted-foreground opacity-70 hover:opacity-100"
            )}
          >
            <span aria-hidden className="leyenda-punto size-2 rounded-full" />
            {FUENTE_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="calendario overflow-hidden rounded-2xl bg-card p-2 shadow-soft ring-1 ring-foreground/6 sm:p-3">
        <FullCalendar
          ref={ref}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          locale={esLocale}
          initialView={vista}
          headerToolbar={false}
          height="auto"
          firstDay={1}
          nowIndicator
          editable
          selectable
          selectMirror
          dayMaxEvents
          forceEventDuration
          defaultTimedEventDuration="01:00"
          slotMinTime="08:00:00"
          slotMaxTime="21:00:00"
          slotDuration="00:30:00"
          allDaySlot
          allDayText="Todo el día"
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          noEventsText="Nada programado en estas fechas."
          events={cargarEventos}
          loading={setCargando}
          datesSet={(arg) => setTitulo(arg.view.title)}
          eventContent={(arg) => <ContenidoEvento {...arg} />}
          select={(info) => {
            setBorrador(borradorDesdeFechas(info.start, info.end, info.allDay));
            info.view.calendar.unselect();
          }}
          eventClick={(info) => {
            info.jsEvent.preventDefault();
            const item = info.event.extendedProps.item as ItemCalendario;
            if (item.fuente === "evento") setBorrador(borradorDeEvento(info.event));
            else setDetalle(item);
          }}
          eventDrop={guardarFechas}
          eventResize={guardarFechas}
        />
      </div>

      <EventoDialog
        borrador={borrador}
        onClose={() => setBorrador(null)}
        onGuardado={() => api()?.refetchEvents()}
      />
      <DetalleDialog item={detalle} onClose={() => setDetalle(null)} />
    </div>
  );
}
