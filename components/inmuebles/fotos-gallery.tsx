"use client";

import { useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

import { moverFoto, eliminarArchivo } from "@/lib/actions/archivos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type FotoInmueble = {
  id: string;
  url: string;
  nombreOriginal: string;
};

export function FotosGallery({ fotos }: { fotos: FotoInmueble[] }) {
  const [isPending, startTransition] = useTransition();

  function mover(id: string, direccion: "arriba" | "abajo") {
    startTransition(async () => {
      const result = await moverFoto(id, direccion);
      if (!result.success) toast.error("No se pudo reordenar la foto.");
    });
  }

  function eliminar(id: string) {
    startTransition(async () => {
      const result = await eliminarArchivo(id);
      if (!result.success) {
        toast.error("No se pudo eliminar la foto.");
        return;
      }
      toast.success("Foto eliminada.");
    });
  }

  if (fotos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay fotos de este inmueble.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {fotos.map((foto, index) => (
        <div key={foto.id} className="flex flex-col gap-1 rounded-lg border p-2">
          <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
            <Image
              src={foto.url}
              alt={foto.nombreOriginal}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover"
            />
            {index === 0 && (
              <Badge className="absolute left-1 top-1">Portada</Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Mover a la izquierda"
                disabled={isPending || index === 0}
                onClick={() => mover(foto.id, "arriba")}
              >
                <ChevronLeft />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Mover a la derecha"
                disabled={isPending || index === fotos.length - 1}
                onClick={() => mover(foto.id, "abajo")}
              >
                <ChevronRight />
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Eliminar foto"
              disabled={isPending}
              onClick={() => eliminar(foto.id)}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
