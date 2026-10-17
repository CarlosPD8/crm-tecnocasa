"use client";

import { useMemo, useState, useTransition } from "react";
import { LocateFixed, PenLine } from "lucide-react";
import { toast } from "sonner";

import { guardarFormaZona } from "@/lib/actions/zonas";
import { obtenerPosicion } from "@/lib/ubicacion/cliente";
import { MENSAJES_UBICACION, type FormaZona } from "@/lib/validations/ubicacion";
import { Mapa, type PuntoMapa, type ZonaMapa } from "@/components/mapa/mapa";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  zona: ZonaMapa;
  /** Every zone of the office, shown faded for reference. */
  zonas: ZonaMapa[];
  oficina: (PuntoMapa & { radio: number }) | null;
};

function Dibujo({ zona, zonas, oficina, onClose }: Props & { onClose: () => void }) {
  const [forma, setForma] = useState<FormaZona | null>(zona.forma);
  const [reinicio, setReinicio] = useState(0);
  const [centrar, setCentrar] = useState<PuntoMapa | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dibujar = useMemo(() => ({ zonaId: zona.id, reinicio, onChange: setForma }), [zona.id, reinicio]);

  async function irAMiUbicacion() {
    setBuscando(true);
    const l = await obtenerPosicion();
    setBuscando(false);
    if (!l.ok) {
      toast.error(MENSAJES_UBICACION[l.motivo]);
      return;
    }
    setCentrar({ lat: l.pos.lat, lng: l.pos.lng });
  }

  function guardar(valor: FormaZona | null) {
    startTransition(async () => {
      const r = await guardarFormaZona(zona.id, valor);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success(valor ? "Contorno guardado." : "Contorno borrado.");
      onClose();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Contorno de {zona.nombre}</DialogTitle>
        <DialogDescription>
          {forma
            ? "Arrastra los puntos para ajustarlo; los puntos pequeños añaden uno nuevo. Para quitar un punto, púlsalo con el botón derecho o mantenlo pulsado."
            : "Pulsa en el mapa punto a punto por el borde de la zona y ciérralo pulsando el primer punto."}{" "}
          Sus asesores podrán registrar dentro de este contorno.
        </DialogDescription>
      </DialogHeader>

      <Mapa zonas={zonas} oficina={oficina} dibujar={dibujar} centrarEn={centrar} rueda className="h-[min(60dvh,30rem)]" />

      <DialogFooter className="gap-2 sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" disabled={buscando} onClick={irAMiUbicacion}>
            <LocateFixed /> {buscando ? "Buscando…" : "Ir a mi ubicación"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => {
              setForma(null);
              setReinicio((n) => n + 1);
            }}
          >
            Empezar de nuevo
          </Button>
          {zona.forma && (
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              disabled={isPending}
              onClick={() => guardar(null)}
            >
              Borrar contorno
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={!forma || isPending} onClick={() => guardar(forma)}>
            {isPending ? "Guardando…" : "Guardar contorno"}
          </Button>
        </div>
      </DialogFooter>
    </div>
  );
}

/** Draw or adjust a zone's contour on the map (director only). */
export function DibujarZonaDialog(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <PenLine /> {props.zona.forma ? "Contorno" : "Dibujar"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
          {open && <Dibujo {...props} onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
