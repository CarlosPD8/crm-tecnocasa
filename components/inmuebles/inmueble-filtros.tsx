"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Search, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TIPO_OPERACION_LABELS,
  ESTADO_INMUEBLE_LABELS,
  OCUPACION_LABELS,
} from "@/lib/validations/inmueble";

type Filtro = "q" | "tipoOperacion" | "estado" | "ocupacion" | "potencial";

export function InmuebleFiltros({
  defaultQ,
  defaultTipoOperacion,
  defaultEstado,
  defaultOcupacion,
  defaultPotencial,
}: {
  defaultQ?: string;
  defaultTipoOperacion?: string;
  defaultEstado?: string;
  defaultOcupacion?: string;
  defaultPotencial?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(defaultQ ?? "");
  // Controlled: the server re-renders with new defaults after each navigation,
  // and an uncontrolled Select must not have its default changed after mount.
  const [tipoOperacion, setTipoOperacion] = useState(defaultTipoOperacion ?? "TODOS");
  const [estado, setEstado] = useState(defaultEstado ?? "TODOS");
  const [ocupacion, setOcupacion] = useState(defaultOcupacion ?? "TODOS");
  const [potencial, setPotencial] = useState(Boolean(defaultPotencial));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateParams(next: Partial<Record<Filtro, string>>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(next)) {
      if (value && value !== "TODOS") params.set(key, value);
      else params.delete(key);
    }

    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Buscar inmuebles"
          placeholder="Referencia, dirección, bloque…"
          value={q}
          onChange={(e) => {
            const value = e.target.value;
            setQ(value);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => updateParams({ q: value }), 300);
          }}
          className="pl-9"
        />
      </div>

      <Select
        items={{ TODOS: "Venta y alquiler", ...TIPO_OPERACION_LABELS }}
        value={tipoOperacion}
        onValueChange={(value) => {
          setTipoOperacion(value as string);
          updateParams({ tipoOperacion: value as string });
        }}
      >
        <SelectTrigger className="w-full sm:w-40" aria-label="Operación">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODOS">Venta y alquiler</SelectItem>
          {Object.entries(TIPO_OPERACION_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={{ TODOS: "Todos los estados", ...ESTADO_INMUEBLE_LABELS }}
        value={estado}
        onValueChange={(value) => {
          setEstado(value as string);
          updateParams({ estado: value as string });
        }}
      >
        <SelectTrigger className="w-full sm:w-40" aria-label="Estado">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODOS">Todos los estados</SelectItem>
          {Object.entries(ESTADO_INMUEBLE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={{ TODOS: "Toda ocupación", ...OCUPACION_LABELS }}
        value={ocupacion}
        onValueChange={(value) => {
          setOcupacion(value as string);
          updateParams({ ocupacion: value as string });
        }}
      >
        <SelectTrigger className="w-full sm:w-40" aria-label="Ocupación">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODOS">Toda ocupación</SelectItem>
          {Object.entries(OCUPACION_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        type="button"
        aria-pressed={potencial}
        onClick={() => {
          const next = !potencial;
          setPotencial(next);
          updateParams({ potencial: next ? "1" : "" });
        }}
        className={cn(
          "inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium whitespace-nowrap transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
          potencial
            ? "border-primary/30 bg-accent text-accent-foreground"
            : "border-input bg-card text-muted-foreground hover:text-foreground"
        )}
      >
        <Target className="size-4" />
        Solo potenciales
      </button>
    </div>
  );
}
