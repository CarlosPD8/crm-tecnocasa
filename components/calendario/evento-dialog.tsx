"use client";

import { useState, useTransition } from "react";
import { addDays, format, parseISO } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { actualizarEvento, crearEvento, eliminarEvento } from "@/lib/actions/eventos";
import { TIPO_EVENTO_LABELS, type EventoInput, type TipoEvento } from "@/lib/validations/evento";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, Segmented } from "@/components/shared/form";
import { ClientePicker } from "@/components/shared/cliente-picker";
import { InmueblePicker } from "@/components/shared/inmueble-picker";

type Enlace = { id: string; label: string } | null;

/** Form state. Dates are local "yyyy-MM-dd" and the all-day end is inclusive. */
export type BorradorEvento = {
  id?: string;
  titulo: string;
  tipo: TipoEvento;
  todoElDia: boolean;
  diaInicio: string;
  horaInicio: string;
  diaFin: string;
  horaFin: string;
  notas: string;
  cliente: Enlace;
  inmueble: Enlace;
  /** Existing events: who created it and whether this user may delete it. */
  autor?: string | null;
  puedeEliminar?: boolean;
};

const dia = (d: Date) => format(d, "yyyy-MM-dd");
const hora = (d: Date) => format(d, "HH:mm");

/**
 * Builds a draft from calendar dates (a selection, or an event being edited).
 * `fin` follows the calendar convention: exclusive for all-day ranges.
 */
export function borradorDesdeFechas(
  inicio: Date,
  fin: Date | null,
  todoElDia: boolean,
  resto: Partial<BorradorEvento> = {}
): BorradorEvento {
  if (todoElDia) {
    const ultimoDia = fin && fin > inicio ? addDays(fin, -1) : inicio;
    return {
      titulo: "",
      tipo: "VISITA",
      notas: "",
      cliente: null,
      inmueble: null,
      ...resto,
      todoElDia: true,
      diaInicio: dia(inicio),
      diaFin: dia(ultimoDia),
      horaInicio: "10:00",
      horaFin: "11:00",
    };
  }
  // A single 30-minute slot click becomes a one-hour appointment.
  const finReal = fin && fin.getTime() - inicio.getTime() > 30 * 60_000 ? fin : new Date(inicio.getTime() + 60 * 60_000);
  return {
    titulo: "",
    tipo: "VISITA",
    notas: "",
    cliente: null,
    inmueble: null,
    ...resto,
    todoElDia: false,
    diaInicio: dia(inicio),
    horaInicio: hora(inicio),
    diaFin: dia(finReal),
    horaFin: hora(finReal),
  };
}

function aEntrada(b: BorradorEvento): EventoInput {
  const fechas = b.todoElDia
    ? { inicio: b.diaInicio, fin: b.diaFin ? dia(addDays(parseISO(b.diaFin), 1)) : "" }
    : {
        inicio: b.diaInicio && b.horaInicio ? new Date(`${b.diaInicio}T${b.horaInicio}`).toISOString() : "",
        fin: b.diaFin && b.horaFin ? new Date(`${b.diaFin}T${b.horaFin}`).toISOString() : "",
      };
  return {
    titulo: b.titulo,
    tipo: b.tipo,
    todoElDia: b.todoElDia,
    notas: b.notas,
    clienteId: b.cliente?.id ?? "",
    inmuebleId: b.inmueble?.id ?? "",
    ...fechas,
  };
}

export function EventoDialog({
  borrador,
  onClose,
  onGuardado,
}: {
  borrador: BorradorEvento | null;
  onClose: () => void;
  onGuardado: () => void;
}) {
  return (
    <Dialog open={borrador !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        {borrador && <EventoForm inicial={borrador} onClose={onClose} onGuardado={onGuardado} />}
      </DialogContent>
    </Dialog>
  );
}

function EventoForm({
  inicial,
  onClose,
  onGuardado,
}: {
  inicial: BorradorEvento;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [b, setB] = useState(inicial);
  const [errores, setErrores] = useState<Record<string, string[] | undefined>>({});
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [isPending, startTransition] = useTransition();
  const editando = Boolean(inicial.id);

  const set = <K extends keyof BorradorEvento>(k: K, v: BorradorEvento[K]) => setB((prev) => ({ ...prev, [k]: v }));

  function cambiarDiaInicio(valor: string) {
    // Keep the end with the start when it would otherwise fall before it.
    setB((prev) => ({ ...prev, diaInicio: valor, diaFin: !prev.diaFin || prev.diaFin < valor ? valor : prev.diaFin }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const entrada = aEntrada(b);
    startTransition(async () => {
      try {
        const result = editando ? await actualizarEvento(inicial.id!, entrada) : await crearEvento(entrada);
        if (!result.success) {
          setErrores(result.error);
          // Errors without a field of their own here (e.g. a deleted client).
          const otro = Object.entries(result.error).find(([campo]) => !["titulo", "inicio", "fin"].includes(campo));
          if (otro?.[1]?.[0]) toast.error(otro[1][0]);
          return;
        }
      } catch {
        toast.error("No se pudo guardar el evento. Revisa la conexión e inténtalo de nuevo.");
        return;
      }
      toast.success(editando ? "Evento actualizado." : "Evento creado.");
      onGuardado();
      onClose();
    });
  }

  function handleEliminar() {
    if (!confirmarBorrado) {
      setConfirmarBorrado(true);
      return;
    }
    startTransition(async () => {
      try {
        const result = await eliminarEvento(inicial.id!);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
      } catch {
        toast.error("No se pudo eliminar el evento.");
        return;
      }
      toast.success("Evento eliminado.");
      onGuardado();
      onClose();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>{editando ? "Editar evento" : "Nuevo evento"}</DialogTitle>
        <DialogDescription>
          {editando && inicial.autor
            ? `Creado por ${inicial.autor}. Arrástralo a otro día o estíralo en el calendario.`
            : "Visitas, reuniones o cualquier cita de la oficina. Después podrás arrastrarlo a otro día o estirarlo en el calendario."}
        </DialogDescription>
      </DialogHeader>

      <Field label="Título" htmlFor="ev-titulo" error={errores.titulo?.[0]}>
        <Input
          id="ev-titulo"
          autoFocus
          value={b.titulo}
          onChange={(e) => set("titulo", e.target.value)}
          placeholder="Visita al piso de C/ Estrellas"
          aria-invalid={!!errores.titulo}
        />
      </Field>

      <Field label="Tipo">
        <Segmented
          name="ev-tipo"
          aria-label="Tipo de evento"
          value={b.tipo}
          onChange={(v) => set("tipo", v)}
          options={TIPO_EVENTO_LABELS}
        />
      </Field>

      <div className="flex flex-col gap-3">
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={b.todoElDia}
            onChange={(e) => set("todoElDia", e.target.checked)}
            className="size-4 accent-primary"
          />
          Todo el día
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-3">
          <Field label="Empieza" htmlFor="ev-dia-inicio" error={errores.inicio?.[0]}>
            <Input id="ev-dia-inicio" type="date" value={b.diaInicio} onChange={(e) => cambiarDiaInicio(e.target.value)} />
          </Field>
          {!b.todoElDia ? (
            <Field label="Hora" htmlFor="ev-hora-inicio">
              <Input
                id="ev-hora-inicio"
                type="time"
                step={900}
                className="tabular"
                value={b.horaInicio}
                onChange={(e) => set("horaInicio", e.target.value)}
              />
            </Field>
          ) : (
            <span />
          )}
          <Field label="Termina" htmlFor="ev-dia-fin" error={errores.fin?.[0]}>
            <Input
              id="ev-dia-fin"
              type="date"
              min={b.diaInicio}
              value={b.diaFin}
              onChange={(e) => set("diaFin", e.target.value)}
              aria-invalid={!!errores.fin}
            />
          </Field>
          {!b.todoElDia ? (
            <Field label="Hora" htmlFor="ev-hora-fin">
              <Input
                id="ev-hora-fin"
                type="time"
                step={900}
                className="tabular"
                value={b.horaFin}
                onChange={(e) => set("horaFin", e.target.value)}
              />
            </Field>
          ) : (
            <span />
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente" optional>
          <ClientePicker
            value={b.cliente?.id ?? null}
            valueLabel={b.cliente?.label}
            onChange={(c) => set("cliente", c)}
            placeholder="Buscar cliente…"
          />
        </Field>
        <Field label="Inmueble" optional>
          <InmueblePicker
            value={b.inmueble?.id ?? null}
            valueLabel={b.inmueble?.label}
            onChange={(i) => set("inmueble", i)}
          />
        </Field>
      </div>

      <Field label="Notas" htmlFor="ev-notas" optional>
        <Textarea
          id="ev-notas"
          rows={3}
          value={b.notas}
          onChange={(e) => set("notas", e.target.value)}
          placeholder="Llevar llaves, avisar al portero…"
        />
      </Field>

      <DialogFooter className="gap-2 sm:justify-between">
        {editando && inicial.puedeEliminar !== false ? (
          <Button
            type="button"
            variant={confirmarBorrado ? "destructive" : "ghost"}
            className={confirmarBorrado ? undefined : "text-muted-foreground hover:text-destructive"}
            disabled={isPending}
            onClick={handleEliminar}
            onBlur={() => setConfirmarBorrado(false)}
          >
            <Trash2 /> {confirmarBorrado ? "Confirmar borrado" : "Eliminar"}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando…" : editando ? "Guardar cambios" : "Crear evento"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
