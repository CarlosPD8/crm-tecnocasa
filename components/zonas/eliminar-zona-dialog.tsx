"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { eliminarZona } from "@/lib/actions/zonas";
import type { OpcionZona } from "@/lib/db";
import { Field } from "@/components/shared/form";
import { ZonaSelect } from "@/components/zonas/zona-select";
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

/** Deleting a zone moves its blocks and flats to another one, chosen here. */
export function EliminarZonaDialog({
  zona,
  otras,
  bloques,
  pisos,
}: {
  zona: { id: string; nombre: string };
  otras: OpcionZona[];
  bloques: number;
  pisos: number;
}) {
  const [open, setOpen] = useState(false);
  const [destino, setDestino] = useState("");
  const [isPending, startTransition] = useTransition();
  const conContenido = bloques + pisos > 0;
  const sinDestino = conContenido && !otras.length;

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (conContenido && !destino) return;
    startTransition(async () => {
      const result = await eliminarZona(zona.id, conContenido ? destino : null);
      if (!result.success) {
        setOpen(false);
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success(`Zona ${zona.nombre} eliminada.`);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
            <Trash2 /> Eliminar
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar la zona {zona.nombre}?</AlertDialogTitle>
          <AlertDialogDescription>
            {sinDestino
              ? "Es la única zona y tiene bloques o pisos: crea antes otra zona a la que pasarlos."
              : conContenido
                ? `Sus ${bloques === 1 ? "1 bloque" : `${bloques} bloques`} y ${pisos === 1 ? "1 piso" : `${pisos} pisos`} pasarán a la zona que elijas. Sus asesores dejarán de tenerla asignada.`
                : "No tiene bloques ni pisos. Sus asesores dejarán de tenerla asignada."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {conContenido && !sinDestino && (
          <Field label="Pasar sus bloques y pisos a" htmlFor="z-destino">
            <ZonaSelect id="z-destino" value={destino} onChange={setDestino} zonas={otras} />
          </Field>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || sinDestino || (conContenido && !destino)}
            onClick={handleDelete}
            variant="destructive"
          >
            {isPending ? "Eliminando…" : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
