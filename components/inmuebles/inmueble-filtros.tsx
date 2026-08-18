"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

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
      <Input
        placeholder="Buscar por referencia, dirección o localidad..."
        value={q}
        onChange={(e) => {
          const value = e.target.value;
          setQ(value);
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => updateParams({ q: value }), 300);
        }}
        className="sm:max-w-xs"
      />

      <Select
        defaultValue={defaultTipoOperacion ?? "TODOS"}
        onValueChange={(value) => updateParams({ tipoOperacion: value as string })}
      >
        <SelectTrigger className="sm:w-44">
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
        defaultValue={defaultEstado ?? "TODOS"}
        onValueChange={(value) => updateParams({ estado: value as string })}
      >
        <SelectTrigger className="sm:w-44">
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
