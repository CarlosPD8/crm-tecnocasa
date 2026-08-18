"use client";

import { useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { buscarClientes } from "@/lib/actions/clientes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ClienteResultado = {
  id: string;
  nombre: string;
  apellidos: string;
  telefono: string | null;
};

export function ClientePicker({
  value,
  valueLabel,
  onChange,
  placeholder = "Buscar cliente...",
}: {
  value: string | null;
  valueLabel?: string | null;
  onChange: (cliente: { id: string; label: string } | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ClienteResultado[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResultados([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const r = await buscarClientes(value);
      setResultados(r);
      setLoading(false);
    }, 300);
  }

  return (
    <div className="flex items-center gap-2">
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
              className="w-full justify-start font-normal"
            >
              <Search className="mr-1 size-4 text-muted-foreground" />
              {value && valueLabel ? valueLabel : placeholder}
            </Button>
          }
        />
        <PopoverContent className="w-80" align="start">
          <Input
            autoFocus
            placeholder="Nombre, teléfono o email..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
          />
          <div className="mt-2 flex max-h-56 flex-col gap-1 overflow-y-auto">
            {loading && (
              <p className="p-2 text-xs text-muted-foreground">Buscando...</p>
            )}
            {!loading && query.trim() && resultados.length === 0 && (
              <p className="p-2 text-xs text-muted-foreground">Sin resultados.</p>
            )}
            {resultados.map((cliente) => (
              <button
                key={cliente.id}
                type="button"
                className="rounded-md p-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onChange({
                    id: cliente.id,
                    label: `${cliente.nombre} ${cliente.apellidos}`,
                  });
                  setOpen(false);
                  setQuery("");
                }}
              >
                {cliente.nombre} {cliente.apellidos}
                {cliente.telefono && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({cliente.telefono})
                  </span>
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Quitar selección"
          onClick={() => onChange(null)}
        >
          <X />
        </Button>
      )}
    </div>
  );
}
