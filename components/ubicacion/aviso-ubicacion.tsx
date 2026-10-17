"use client";

import { LoaderCircle, MapPinOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AYUDA_PERMISO, plataforma } from "@/lib/ubicacion/cliente";
import type { LugarFormulario } from "@/components/ubicacion/ubicacion-provider";

/**
 * Why this form can't be saved from here, and what to do. Nothing when the
 * location allows it (there's no "you're in your zone" indicator on purpose).
 */
export function AvisoUbicacion({ lugar, className }: { lugar: LugarFormulario; className?: string }) {
  const { estado, reintentar } = lugar;

  if (estado.tipo === "comprobando") {
    return (
      <p className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)} aria-live="polite">
        <LoaderCircle className="size-4 animate-spin" />
        Comprobando tu ubicación…
      </p>
    );
  }
  if (estado.tipo !== "bloqueado") return null;

  const dispositivo = plataforma();
  const ayuda =
    estado.motivo === "denegada"
      ? AYUDA_PERMISO[dispositivo]
      : dispositivo === "ordenador" && (estado.motivo === "imprecisa" || estado.motivo === "no-disponible")
        ? "Si estás en la oficina, pide al director que marque la red de la oficina."
        : null;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="flex gap-2.5">
        <MapPinOff className="mt-0.5 size-4 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className="font-medium">{estado.mensaje}</p>
          {ayuda && <p className="text-destructive/80">{ayuda}</p>}
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" className="shrink-0 self-start" onClick={() => void reintentar()}>
        Volver a comprobar
      </Button>
    </div>
  );
}
