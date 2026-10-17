"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { useLugar } from "@/components/ubicacion/ubicacion-provider";
import { eliminarInmueble } from "@/lib/actions/inmuebles";
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

export function EliminarInmuebleDialog({
  inmuebleId,
  referencia,
}: {
  inmuebleId: string;
  referencia: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { guardar } = useLugar();

  function handleDelete() {
    startTransition(async () => {
      const result = await guardar((ub) => eliminarInmueble(inmuebleId, ub));
      if (!result) {
        setOpen(false);
        return;
      }
      if (!result.success) {
        // Close so the dialog doesn't cover the page behind the error toast.
        setOpen(false);
        toast.error(result.error);
        return;
      }
      toast.success("Inmueble eliminado.");
      router.push("/inmuebles");
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
          <AlertDialogTitle>¿Eliminar el inmueble {referencia}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminarán sus fotos,
            documentos, interesados y contactos (también de la ficha de las
            personas con las que se habló). No se podrá eliminar si tiene
            operaciones cerradas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isPending} onClick={handleDelete}>
            {isPending ? "Eliminando…" : "Eliminar inmueble"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
