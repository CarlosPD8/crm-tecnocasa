"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIPO_CLIENTE_LABELS } from "@/lib/validations/cliente";

export function ClienteFiltros({
  defaultQ,
  defaultTipo,
}: {
  defaultQ?: string;
  defaultTipo?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(defaultQ ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateParams(next: { q?: string; tipo?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }

    if (next.tipo !== undefined) {
      if (next.tipo && next.tipo !== "TODOS") params.set("tipo", next.tipo);
      else params.delete("tipo");
    }

    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        placeholder="Buscar por nombre, teléfono o email..."
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
        defaultValue={defaultTipo ?? "TODOS"}
        onValueChange={(value) => updateParams({ tipo: value as string })}
      >
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder="Todos los tipos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODOS">Todos los tipos</SelectItem>
          {Object.entries(TIPO_CLIENTE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
