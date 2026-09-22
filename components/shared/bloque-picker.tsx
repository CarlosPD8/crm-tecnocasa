"use client";

import { useRef, useState, useTransition } from "react";
import { Building, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import { buscarBloques, crearBloque } from "@/lib/actions/bloques";
import { formatBloque } from "@/lib/validations/bloque";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Field } from "@/components/shared/form";

export type BloqueSeleccionado = {
  id: string;
  calle: string;
  numero: string;
  localidad: string;
};

type BloqueResultado = Awaited<ReturnType<typeof buscarBloques>>[number];

export function BloquePicker({
  value,
  onChange,
  obtenerLocalidad,
}: {
  value: BloqueSeleccionado | null;
  onChange: (bloque: BloqueSeleccionado | null) => void;
  /** Read at the moment «Nuevo bloque» is clicked, so it reflects what was just typed. */
  obtenerLocalidad?: () => string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [creando, setCreando] = useState(false);
  // Captured when the dialog opens: its input's default must not change while mounted.
  const [localidadInicial, setLocalidadInicial] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<BloqueResultado[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(next: string) {
    setQuery(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!next.trim()) {
      setResultados([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      setResultados(await buscarBloques(next));
      setLoading(false);
    }, 300);
  }

  function elegir(bloque: BloqueSeleccionado) {
    onChange(bloque);
    setOpen(false);
    setQuery("");
    setResultados([]);
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            setQuery("");
            setResultados([]);
            setLoading(false);
          }
        }}
      >
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full min-w-0 justify-start gap-2 px-3 font-normal"
            >
              {value ? (
                <>
                  <Building className="size-4 text-primary" />
                  <span className="truncate font-medium">{formatBloque(value)}</span>
                  <span className="truncate text-muted-foreground">· {value.localidad}</span>
                </>
              ) : (
                <>
                  <Search className="size-4 text-muted-foreground" />
                  <span className="truncate text-muted-foreground">Buscar bloque por calle o nombre…</span>
                </>
              )}
            </Button>
          }
        />
        <PopoverContent className="w-80 p-2" align="start">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              aria-label="Buscar bloque"
              placeholder="Calle, número o nombre…"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="mt-1.5 flex max-h-64 flex-col gap-0.5 overflow-y-auto">
            {loading &&
              [0, 1].map((i) => (
                <div key={i} className="flex items-center gap-2.5 p-2">
                  <Skeleton className="size-7 rounded-[30%]" />
                  <Skeleton className="h-3 flex-1" />
                </div>
              ))}
            {!loading && query.trim() && resultados.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                Ningún bloque coincide con «{query.trim()}».
              </p>
            )}
            {!loading &&
              resultados.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="flex items-center gap-2.5 rounded-md p-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none"
                  onClick={() => elegir(b)}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-[30%] bg-secondary text-secondary-foreground">
                    <Building className="size-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{formatBloque(b)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[b.nombre, b.localidad].filter(Boolean).join(" · ")} ·{" "}
                      <span className="tabular">{b._count.inmuebles}</span>{" "}
                      {b._count.inmuebles === 1 ? "inmueble" : "inmuebles"}
                    </span>
                  </span>
                </button>
              ))}
          </div>
          <div className="mt-1.5 border-t border-border/70 pt-1.5">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm font-medium text-primary transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              onClick={() => {
                setOpen(false);
                setLocalidadInicial(obtenerLocalidad?.());
                setCreando(true);
              }}
            >
              <Plus className="size-4" /> Nuevo bloque
            </button>
          </div>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Quitar bloque"
          onClick={() => onChange(null)}
        >
          <X />
        </Button>
      )}

      <NuevoBloqueDialog
        open={creando}
        onOpenChange={setCreando}
        defaultLocalidad={localidadInicial}
        onCreated={(b) => {
          elegir(b);
          setCreando(false);
        }}
      />
    </div>
  );
}

function NuevoBloqueDialog({
  open,
  onOpenChange,
  defaultLocalidad,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLocalidad?: string;
  onCreated: (bloque: BloqueSeleccionado) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errores, setErrores] = useState<Record<string, string[] | undefined>>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // The dialog is portaled out of the property form in the DOM, but React
    // still bubbles submit through the component tree — stop it here.
    e.preventDefault();
    e.stopPropagation();
    const fd = new FormData(e.currentTarget);
    const data = {
      calle: String(fd.get("calle") ?? ""),
      numero: String(fd.get("numero") ?? ""),
      localidad: String(fd.get("localidad") ?? ""),
      nombre: String(fd.get("nombre") ?? ""),
    };
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof crearBloque>>;
      try {
        result = await crearBloque(data);
      } catch {
        // Keep the user on the property form (and what they typed) instead of
        // bubbling up to the error page when the server is unreachable.
        toast.error("No se pudo crear el bloque. Revisa la conexión e inténtalo de nuevo.");
        return;
      }
      if (!result.success) {
        setErrores(result.error);
        return;
      }
      setErrores({});
      toast.success("Bloque creado.");
      onCreated(result.bloque);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>Nuevo bloque</DialogTitle>
            <DialogDescription>
              Calle, número y localidad identifican el edificio. Luego podrás añadirle más datos desde Bloques.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
            <Field label="Calle" htmlFor="nb-calle" error={errores.calle?.[0]}>
              <Input id="nb-calle" name="calle" placeholder="C/ Estrellas" autoFocus aria-invalid={!!errores.calle} />
            </Field>
            <Field label="Número" htmlFor="nb-numero" error={errores.numero?.[0]}>
              <Input id="nb-numero" name="numero" placeholder="22" aria-invalid={!!errores.numero} />
            </Field>
            <Field label="Localidad" htmlFor="nb-localidad" error={errores.localidad?.[0]} className="sm:col-span-2">
              <Input
                id="nb-localidad"
                name="localidad"
                defaultValue={defaultLocalidad}
                aria-invalid={!!errores.localidad}
              />
            </Field>
            <Field label="Nombre" htmlFor="nb-nombre" optional className="sm:col-span-2">
              <Input id="nb-nombre" name="nombre" placeholder="Residencial Los Álamos" />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creando…" : "Crear bloque"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
