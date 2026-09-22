"use client";

import { useRef, useState } from "react";
import { Home, Search, X } from "lucide-react";

import { buscarInmuebles } from "@/lib/actions/inmuebles";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type InmuebleResultado = Awaited<ReturnType<typeof buscarInmuebles>>[number];

export function InmueblePicker({
  value,
  valueLabel,
  onChange,
  placeholder = "Buscar inmueble…",
}: {
  value: string | null;
  valueLabel?: string | null;
  onChange: (inmueble: { id: string; label: string } | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<InmuebleResultado[]>([]);
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
      setResultados(await buscarInmuebles(next));
      setLoading(false);
    }, 300);
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
              {value && valueLabel ? (
                <>
                  <Home className="size-4 text-primary" />
                  <span className="truncate font-medium">{valueLabel}</span>
                </>
              ) : (
                <>
                  <Search className="size-4 text-muted-foreground" />
                  <span className="truncate text-muted-foreground">{placeholder}</span>
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
              aria-label="Buscar inmueble"
              placeholder="Referencia o dirección…"
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
            {!loading && !query.trim() && (
              <p className="px-2 py-3 text-xs text-muted-foreground">Escribe para buscar en la cartera.</p>
            )}
            {!loading && query.trim() && resultados.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                Ningún inmueble coincide con «{query.trim()}».
              </p>
            )}
            {!loading &&
              resultados.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  className="flex items-center gap-2.5 rounded-md p-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none"
                  onClick={() => {
                    onChange({ id: i.id, label: i.referencia });
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-[30%] bg-secondary text-secondary-foreground">
                    <Home className="size-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-xs font-medium">{i.referencia}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {i.direccion} · {i.localidad}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </PopoverContent>
      </Popover>
      {value && (
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar inmueble" onClick={() => onChange(null)}>
          <X />
        </Button>
      )}
    </div>
  );
}
