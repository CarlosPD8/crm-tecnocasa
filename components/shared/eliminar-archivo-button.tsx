"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { useLugar } from "@/components/ubicacion/ubicacion-provider";
import { eliminarArchivo } from "@/lib/actions/archivos";
import { Button } from "@/components/ui/button";

export function EliminarArchivoButton({ archivoId, nombre }: { archivoId: string; nombre: string }) {
  const [isPending, startTransition] = useTransition();
  const { guardar } = useLugar();

  function handleDelete() {
    startTransition(async () => {
      const result = await guardar((ub) => eliminarArchivo(archivoId, ub));
      if (!result) return;
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Archivo eliminado.");
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Eliminar archivo ${nombre}`}
      disabled={isPending}
      onClick={handleDelete}
      className="text-muted-foreground opacity-60 group-hover/item:opacity-100 hover:text-destructive focus-visible:opacity-100"
    >
      <Trash2 />
    </Button>
  );
}
