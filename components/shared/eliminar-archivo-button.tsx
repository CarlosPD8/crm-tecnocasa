"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { eliminarArchivo } from "@/lib/actions/archivos";
import { Button } from "@/components/ui/button";

export function EliminarArchivoButton({ archivoId }: { archivoId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await eliminarArchivo(archivoId);
      if (!result.success) {
        toast.error("No se pudo eliminar el archivo.");
        return;
      }
      toast.success("Archivo eliminado.");
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Eliminar archivo"
      disabled={isPending}
      onClick={handleDelete}
      className="text-muted-foreground opacity-60 group-hover/item:opacity-100 hover:text-destructive focus-visible:opacity-100"
    >
      <Trash2 />
    </Button>
  );
}
