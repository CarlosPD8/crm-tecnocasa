"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Search } from "lucide-react";
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
} from "@/lib/validations/inmueble";

export function InmuebleFiltros({
  defaultQ,
  defaultTipoOperacion,
  defaultEstado,
}: {
  defaultQ?: string;
  defaultTipoOperacion?: string;
  defaultEstado?: string;
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateParams(next: { q?: string; tipoOperacion?: string; estado?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    for (const key of ["q", "tipoOperacion", "estado"] as const) {
      if (next[key] === undefined) continue;
      if (next[key] && next[key] !== "TODOS") params.set(key, next[key]!);
      else params.delete(key);
    }

    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative sm:w-80">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Buscar inmuebles"
          placeholder="Referencia, dirección o localidad…"
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
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Venta/Alquiler" />
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
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Estado" />
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
    </div>
  );
}
