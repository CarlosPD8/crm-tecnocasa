"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { actualizarZona, crearZona } from "@/lib/actions/zonas";
import { COLORES_ZONA, type ColorZona } from "@/lib/validations/zona";
import { Field } from "@/components/shared/form";
import { SelectorMultiple } from "@/components/zonas/selector-multiple";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Errores = Record<string, string[] | undefined>;

export type AsesorZona = { id: string; nombre: string; activo: boolean };

export type ZonaEditable = {
  id: string;
  nombre: string;
  color: string;
  notas: string | null;
  asesorIds: string[];
};

function SelectorColor({ value, onChange }: { value: ColorZona; onChange: (c: ColorZona) => void }) {
  return (
    <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-2">
      {(Object.entries(COLORES_ZONA) as [ColorZona, (typeof COLORES_ZONA)[ColorZona]][]).map(([clave, { label, valor }]) => (
        <label
          key={clave}
          title={label}
          className="relative grid size-8 cursor-pointer place-items-center rounded-lg ring-offset-2 ring-offset-card transition-shadow has-checked:ring-2 has-checked:ring-foreground/70 has-focus-visible:ring-3 has-focus-visible:ring-ring/40"
          style={{ backgroundColor: valor }}
        >
          <input
            type="radio"
            name="color"
            value={clave}
            checked={value === clave}
            onChange={() => onChange(clave)}
            className="sr-only"
          />
          <span className="sr-only">{label}</span>
          {value === clave && <Check aria-hidden className="size-4 text-white" />}
        </label>
      ))}
    </div>
  );
}

function ZonaForm({
  zona,
  asesores,
  onClose,
}: {
  zona: ZonaEditable | null;
  asesores: AsesorZona[];
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(zona?.nombre ?? "");
  const [color, setColor] = useState<ColorZona>(
    zona && Object.hasOwn(COLORES_ZONA, zona.color) ? (zona.color as ColorZona) : "verde"
  );
  const [notas, setNotas] = useState(zona?.notas ?? "");
  const [asesorIds, setAsesorIds] = useState<string[]>(zona?.asesorIds ?? []);
  const [errores, setErrores] = useState<Errores>({});
  const [isPending, startTransition] = useTransition();

  // Active advisors, plus any deactivated one still assigned (so it can be removed).
  const opciones = asesores
    .filter((a) => a.activo || asesorIds.includes(a.id))
    .map((a) => ({ id: a.id, label: a.nombre, detalle: a.activo ? undefined : "desactivado" }));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const datos = { nombre, color, notas, asesorIds };
      const result = zona ? await actualizarZona(zona.id, datos) : await crearZona(datos);
      if (!result.success) {
        setErrores(result.error);
        return;
      }
      toast.success(zona ? "Zona guardada." : "Zona creada.");
      onClose();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>{zona ? `Editar ${zona.nombre}` : "Nueva zona"}</DialogTitle>
        <DialogDescription>
          Sus asesores verán solo los bloques y pisos de sus zonas, y los clientes de esos pisos.
        </DialogDescription>
      </DialogHeader>

      <Field label="Nombre" htmlFor="z-nombre" error={errores.nombre?.[0]}>
        <Input
          id="z-nombre"
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Pajaritos"
          aria-invalid={!!errores.nombre}
        />
      </Field>
      <Field label="Color" error={errores.color?.[0]} hint="Para distinguirla en listas y fichas.">
        <SelectorColor value={color} onChange={setColor} />
      </Field>
      <Field label="Asesores" error={errores.asesorIds?.[0]} hint="Quién trabaja esta zona. Un asesor puede tener varias.">
        <SelectorMultiple
          etiqueta="Asesores"
          opciones={opciones}
          value={asesorIds}
          onChange={setAsesorIds}
          vacio="Aún no hay asesores en el equipo. Añádelos desde Equipo."
        />
      </Field>
      <Field label="Notas" htmlFor="z-notas" optional>
        <Textarea id="z-notas" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
      </Field>

      {errores._?.[0] && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errores._[0]}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : zona ? "Guardar" : "Crear zona"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** «Nueva zona» or «Editar» (director only). */
export function ZonaDialog({
  zona,
  asesores,
  className,
}: {
  zona?: ZonaEditable;
  asesores: AsesorZona[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {zona ? (
        <Button variant="ghost" size="sm" className={className} onClick={() => setOpen(true)}>
          <Pencil /> Editar
        </Button>
      ) : (
        <Button size="lg" className={cn(className)} onClick={() => setOpen(true)}>
          <Plus /> Nueva zona
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          {open && <ZonaForm zona={zona ?? null} asesores={asesores} onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
