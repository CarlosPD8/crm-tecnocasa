"use client";

import { useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ImageOff, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { moverFoto, eliminarArchivo } from "@/lib/actions/archivos";

export type FotoInmueble = {
  id: string;
  url: string;
  nombreOriginal: string;
};

const botonFoto =
  "grid size-7 place-items-center rounded-md bg-card/90 text-foreground shadow-soft backdrop-blur-sm transition-[background-color,transform,opacity] duration-200 hover:bg-card active:scale-95 disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none [&_svg]:size-3.5";

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
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <ImageOff className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Sin fotos todavía. La primera que subas será la portada.
        </p>
      </div>
    );
  }

  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
        isPending && "opacity-70 transition-opacity"
      )}
    >
      {fotos.map((foto, index) => (
        <li
          key={foto.id}
          className={cn(
            "group relative overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/6",
            index === 0 ? "col-span-2 aspect-4/3 sm:row-span-2 sm:aspect-square" : "aspect-square"
          )}
        >
          <Image
            src={foto.url}
            alt={foto.nombreOriginal}
            fill
            sizes={
              index === 0
                ? "(min-width: 1024px) 50vw, 100vw"
                : "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            }
            className="object-cover transition-transform duration-500 ease-out-soft group-hover:scale-[1.03]"
          />
          {index === 0 && (
            <span className="absolute top-2.5 left-2.5 rounded-md bg-card/90 px-2 py-0.5 text-xs font-medium shadow-soft backdrop-blur-sm">
              Portada
            </span>
          )}
          <div className="absolute inset-x-2 bottom-2 flex items-center justify-between opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            <div className="flex gap-1">
              <button
                type="button"
                className={botonFoto}
                aria-label="Mover antes"
                disabled={isPending || index === 0}
                onClick={() => mover(foto.id, "arriba")}
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                className={botonFoto}
                aria-label="Mover después"
                disabled={isPending || index === fotos.length - 1}
                onClick={() => mover(foto.id, "abajo")}
              >
                <ChevronRight />
              </button>
            </div>
            <button
              type="button"
              className={cn(botonFoto, "hover:text-destructive")}
              aria-label={`Eliminar foto ${foto.nombreOriginal}`}
              disabled={isPending}
              onClick={() => eliminar(foto.id)}
            >
              <Trash2 />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
