"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { eliminarBloque } from "@/lib/actions/bloques";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function EliminarBloqueDialog({
  bloqueId,
  direccion,
  pisos,
}: {
  bloqueId: string;
  direccion: string;
  pisos: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await eliminarBloque(bloqueId);
      if (!result.success) {
        // Close so the dialog doesn't cover the page behind the error toast.
        setOpen(false);
        toast.error(result.error);
        return;
      }
      toast.success("Bloque eliminado.");
      router.push("/bloques");
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="lg" className="text-muted-foreground hover:text-destructive">
            <Trash2 /> Eliminar
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar el bloque {direccion}?</AlertDialogTitle>
          <AlertDialogDescription>
            {pisos > 0
              ? pisos === 1
                ? "Tiene 1 inmueble. Para eliminarlo, primero quita ese inmueble del bloque desde su ficha."
                : `Tiene ${pisos} inmuebles. Para eliminarlo, primero quítalos del bloque desde su ficha.`
              : "Esta acción no se puede deshacer."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={handleDelete} variant="destructive">
            {isPending ? "Eliminando…" : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
