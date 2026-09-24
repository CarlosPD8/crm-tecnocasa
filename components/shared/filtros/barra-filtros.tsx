"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Funnel, LoaderCircle, RotateCcw, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { DEFINICIONES, type EntidadFiltrable } from "@/lib/filtros/definiciones";
import { LIMITE_EXPORTACION } from "@/lib/exportar/limite";
import {
  describirValor,
  leerFecha,
  leerMulti,
  leerRango,
  PRESETS_FECHA,
  type Campo,
  type CampoBool,
  type CampoFecha,
  type CampoMulti,
  type CampoRango,
} from "@/lib/filtros/tipos";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AffixInput, Segmented } from "@/components/shared/form";

type Valores = Record<string, string>;
type OpcionesDinamicas = Record<string, Record<string, string>>;

export function BarraFiltros({
  entidad,
  placeholder,
  ariaBusqueda,
  opciones = {},
  exportar,
}: {
  entidad: EntidadFiltrable;
  placeholder: string;
  ariaBusqueda: string;
  /** Options loaded from the database for fields declared as "dinamico". */
  opciones?: OpcionesDinamicas;
  /** Directors only: offers the Excel of what the list shows (`total` rows). */
  exportar?: { total: number };
}) {
  const definicion = DEFINICIONES[entidad];
  const campos = definicion.campos as readonly Campo[];
  const ordenes = definicion.orden as Record<string, string>;
  const ordenPorDefecto = Object.keys(ordenes)[0];

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState<Valores>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const activos = campos.filter((c) => searchParams.get(c.clave));
  const orden = searchParams.get("orden") ?? ordenPorDefecto;

  function navegar(cambios: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) params.set(clave, valor);
      else params.delete(clave);
    }
    params.delete("page");
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  }

  function abrir(siguiente: boolean) {
    if (siguiente) {
      // Start from what is applied now; nothing changes until «Aplicar».
      const actual: Valores = {};
      for (const c of campos) {
        const v = searchParams.get(c.clave);
        if (v) actual[c.clave] = v;
      }
      actual.orden = orden;
      setBorrador(actual);
    }
    setAbierto(siguiente);
  }

  function aplicar(e?: React.FormEvent) {
    e?.preventDefault();
    const cambios: Record<string, string | null> = {};
    for (const c of campos) cambios[c.clave] = limpiar(c, borrador[c.clave]);
    cambios.orden = borrador.orden && borrador.orden !== ordenPorDefecto ? borrador.orden : null;
    navegar(cambios);
    setAbierto(false);
  }

  function quitarTodo() {
    navegar(Object.fromEntries(campos.map((c) => [c.clave, null])));
  }

  const set = (clave: string, valor: string) => setBorrador((b) => ({ ...b, [clave]: valor }));
  const enBorrador = campos.filter((c) => limpiar(c, borrador[c.clave])).length;
  const grupos = [...new Set(campos.map((c) => c.grupo))];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={ariaBusqueda}
            placeholder={placeholder}
            value={q}
            onChange={(e) => {
              const value = e.target.value;
              setQ(value);
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => navegar({ q: value.trim() || null }), 300);
            }}
            className="pl-9"
          />
        </div>

        <Popover open={abierto} onOpenChange={abrir}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className={cn(
                  "h-9 shrink-0 gap-2",
                  activos.length > 0 && "border-primary/30 bg-accent text-accent-foreground hover:bg-accent"
                )}
              >
                {isPending ? <LoaderCircle className="animate-spin" /> : <Funnel />}
                <span className="hidden sm:inline">Filtros</span>
                {activos.length > 0 && (
                  <span className="tabular grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[0.7rem] leading-5 font-semibold text-primary-foreground">
                    {activos.length}
                  </span>
                )}
              </Button>
            }
            aria-label={activos.length ? `Filtros (${activos.length} activos)` : "Filtros"}
          />
          <PopoverContent align="start" className="w-[min(calc(100vw-2rem),46rem)] gap-0 overflow-hidden p-0">
            <form onSubmit={aplicar} className="flex max-h-[min(78dvh,42rem)] flex-col">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Funnel className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold">Filtros</h2>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Ordenar por
                  <Select
                    items={ordenes}
                    value={borrador.orden ?? ordenPorDefecto}
                    onValueChange={(v) => set("orden", v as string)}
                  >
                    <SelectTrigger size="sm" className="w-56" aria-label="Ordenar por">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ordenes).map(([valor, etiqueta]) => (
                        <SelectItem key={valor} value={valor}>
                          {etiqueta}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </header>

              <div className="flex-1 overflow-y-auto overscroll-contain px-4">
                {grupos.map((grupo) => (
                  <section key={grupo} className="border-b border-border/60 py-4 last:border-b-0">
                    <h3 className="eyebrow mb-3">{grupo}</h3>
                    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                      {campos
                        .filter((c) => c.grupo === grupo)
                        .map((c) => (
                          <ControlCampo
                            key={c.clave}
                            campo={c}
                            valor={borrador[c.clave] ?? ""}
                            onChange={(v) => set(c.clave, v)}
                            opciones={opciones[c.clave]}
                          />
                        ))}
                    </div>
                  </section>
                ))}
              </div>

              <footer className="flex items-center justify-between gap-2 border-t border-border/70 bg-surface/60 px-4 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={enBorrador === 0}
                  onClick={() => setBorrador({ orden: borrador.orden ?? ordenPorDefecto })}
                >
                  <RotateCcw /> Limpiar
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm">
                    Aplicar{enBorrador > 0 ? ` (${enBorrador})` : ""}
                  </Button>
                </div>
              </footer>
            </form>
          </PopoverContent>
        </Popover>

        {exportar && <BotonExportar total={exportar.total} />}
      </div>

      {activos.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1.5" aria-label="Filtros activos">
          {activos.map((c) => {
            const texto = describirValor(c, searchParams.get(c.clave)!, opciones[c.clave]);
            if (!texto) return null;
            return (
              <li key={c.clave}>
                <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-card py-0.5 pr-1 pl-3 text-xs shadow-soft">
                  <span className="text-muted-foreground">{c.etiqueta}:</span>
                  <span className="max-w-[24ch] truncate font-medium">{texto}</span>
                  <button
                    type="button"
                    aria-label={`Quitar filtro ${c.etiqueta}`}
                    onClick={() => navegar({ [c.clave]: null })}
                    className="grid size-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              </li>
            );
          })}
          {activos.length > 1 && (
            <li>
              <button
                type="button"
                onClick={quitarTodo}
                className="rounded-full px-2 py-0.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Quitar todos
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** Normalises a draft value; empty/incomplete values become null (param removed). */
function limpiar(campo: Campo, valor: string | undefined): string | null {
  if (!valor) return null;
  switch (campo.tipo) {
    case "multi":
      return leerMulti(valor).join(",") || null;
    case "rango":
      return leerRango(valor) ? valor : null;
    case "fecha":
      return valor.startsWith("p:") || leerFecha(valor) ? valor : null;
    case "bool":
      return valor === "1" || valor === "0" ? valor : null;
    case "texto":
      return valor.trim() || null;
  }
}

function ControlCampo({
  campo,
  valor,
  onChange,
  opciones,
}: {
  campo: Campo;
  valor: string;
  onChange: (valor: string) => void;
  opciones?: Record<string, string>;
}) {
  const id = `filtro-${campo.clave}`;
  const ancho = campo.tipo === "multi" || campo.tipo === "fecha" ? "sm:col-span-2" : "";
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", ancho)}>
      <label htmlFor={campo.tipo === "texto" ? id : undefined} id={`${id}-label`} className="text-xs font-medium">
        {campo.etiqueta}
      </label>
      {campo.tipo === "multi" && <Multi campo={campo} valor={valor} onChange={onChange} opciones={opciones} />}
      {campo.tipo === "rango" && <Rango campo={campo} valor={valor} onChange={onChange} />}
      {campo.tipo === "fecha" && <Fecha campo={campo} valor={valor} onChange={onChange} />}
      {campo.tipo === "bool" && <Booleano campo={campo} valor={valor} onChange={onChange} />}
      {campo.tipo === "texto" && (
        <Input id={id} value={valor} placeholder={campo.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97] focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
        activo
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Multi({
  campo,
  valor,
  onChange,
  opciones,
}: {
  campo: CampoMulti;
  valor: string;
  onChange: (v: string) => void;
  opciones?: Record<string, string>;
}) {
  const lista = campo.opciones === "dinamico" ? opciones ?? {} : campo.opciones;
  const seleccion = leerMulti(valor);
  const entradas = Object.entries(lista);
  if (!entradas.length) return <p className="text-xs text-muted-foreground">No hay opciones todavía.</p>;
  return (
    <div role="group" aria-labelledby={`filtro-${campo.clave}-label`} className="flex flex-wrap gap-1.5">
      {entradas.map(([v, etiqueta]) => {
        const activo = seleccion.includes(v);
        return (
          <Chip
            key={v}
            activo={activo}
            onClick={() => onChange((activo ? seleccion.filter((s) => s !== v) : [...seleccion, v]).join(","))}
          >
            {etiqueta}
          </Chip>
        );
      })}
    </div>
  );
}

function Rango({ campo, valor, onChange }: { campo: CampoRango; valor: string; onChange: (v: string) => void }) {
  const [min = "", max = ""] = valor.split("~");
  const props = {
    type: "number" as const,
    min: 0,
    step: campo.entero ? 1 : "any",
    inputMode: campo.entero ? ("numeric" as const) : ("decimal" as const),
  };
  const campoInput = (lado: "min" | "max", valorLado: string) => {
    const onLado = (v: string) => onChange(lado === "min" ? `${v}~${max}` : `${min}~${v}`);
    const aria = `${campo.etiqueta} ${lado === "min" ? "mínimo" : "máximo"}`;
    return campo.sufijo ? (
      <AffixInput
        {...props}
        suffix={campo.sufijo}
        aria-label={aria}
        placeholder={lado === "min" ? "Mín." : "Máx."}
        value={valorLado}
        onChange={(e) => onLado(e.target.value)}
      />
    ) : (
      <Input
        {...props}
        className="tabular"
        aria-label={aria}
        placeholder={lado === "min" ? "Mín." : "Máx."}
        value={valorLado}
        onChange={(e) => onLado(e.target.value)}
      />
    );
  };
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      {campoInput("min", min)}
      <span className="text-xs text-muted-foreground">a</span>
      {campoInput("max", max)}
    </div>
  );
}

function Fecha({ campo, valor, onChange }: { campo: CampoFecha; valor: string; onChange: (v: string) => void }) {
  const preset = valor.startsWith("p:") ? valor.slice(2) : null;
  const [desde = "", hasta = ""] = preset ? [] : valor.split("~");
  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-labelledby={`filtro-${campo.clave}-label`} className="flex flex-wrap gap-1.5">
        {campo.presets.map((p) => (
          <Chip key={p} activo={preset === p} onClick={() => onChange(preset === p ? "" : `p:${p}`)}>
            {PRESETS_FECHA[p]}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Input
          type="date"
          aria-label={`${campo.etiqueta} desde`}
          value={desde}
          max={hasta || undefined}
          onChange={(e) => onChange(`${e.target.value}~${hasta}`)}
        />
        <span className="text-xs text-muted-foreground">a</span>
        <Input
          type="date"
          aria-label={`${campo.etiqueta} hasta`}
          value={hasta}
          min={desde || undefined}
          onChange={(e) => onChange(`${desde}~${e.target.value}`)}
        />
      </div>
    </div>
  );
}

const BOOL_A_VALOR = { todos: "", si: "1", no: "0" } as const;

function Booleano({ campo, valor, onChange }: { campo: CampoBool; valor: string; onChange: (v: string) => void }) {
  const actual = valor === "1" ? "si" : valor === "0" ? "no" : "todos";
  return (
    <Segmented
      name={`filtro-${campo.clave}`}
      aria-label={campo.etiqueta}
      value={actual}
      onChange={(v) => onChange(BOOL_A_VALOR[v])}
      options={{ todos: "Indiferente", si: campo.si ?? "Sí", no: campo.no ?? "No" }}
      className="[&_label]:py-1 [&_label]:text-xs"
    />
  );
}

/** Downloads the list as .xlsx with the current search, filters and order. */
function BotonExportar({ total }: { total: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  params.delete("page");
  const query = params.toString();
  const href = `${pathname}/exportar${query ? `?${query}` : ""}`;

  if (total === 0 || total > LIMITE_EXPORTACION) {
    return (
      <Button
        variant="outline"
        className="ml-auto h-9 shrink-0 gap-2"
        disabled
        title={total === 0 ? "No hay nada que exportar" : `Máximo ${LIMITE_EXPORTACION.toLocaleString("es-ES")} filas por archivo: filtra un poco más`}
      >
        <Download /> <span className="hidden sm:inline">Exportar</span>
      </Button>
    );
  }
  return (
    <Button
      variant="outline"
      className="ml-auto h-9 shrink-0 gap-2"
      nativeButton={false}
      render={<a href={href} download aria-label={`Exportar ${total} a Excel`} />}
    >
      <Download /> <span className="hidden sm:inline">Exportar</span>
    </Button>
  );
}
