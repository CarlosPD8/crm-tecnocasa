"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  // Controlled: the server re-renders with new defaults after each navigation,
  // and an uncontrolled Select must not have its default changed after mount.
  const [tipo, setTipo] = useState(defaultTipo ?? "TODOS");
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
      <div className="relative sm:w-80">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Buscar clientes"
          placeholder="Nombre, teléfono o email…"
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
        items={{ TODOS: "Todos los tipos", ...TIPO_CLIENTE_LABELS }}
        value={tipo}
        onValueChange={(value) => {
          setTipo(value as string);
          updateParams({ tipo: value as string });
        }}
      >
        <SelectTrigger className="w-full sm:w-48">
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
