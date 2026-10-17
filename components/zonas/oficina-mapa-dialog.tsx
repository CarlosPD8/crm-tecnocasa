"use client";

import { useState, useTransition } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { toast } from "sonner";

import { guardarOficina } from "@/lib/actions/ubicacion";
import { obtenerPosicion } from "@/lib/ubicacion/cliente";
import { MENSAJES_UBICACION, RADIO_OFICINA } from "@/lib/validations/ubicacion";
import { Mapa, type PuntoMapa, type ZonaMapa } from "@/components/mapa/mapa";
import { AffixInput, Field } from "@/components/shared/form";
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
  oficina: (PuntoMapa & { radio: number }) | null;
  zonas: ZonaMapa[];
};

function OficinaForm({ oficina, zonas, onClose }: Props & { onClose: () => void }) {
  const [punto, setPunto] = useState<PuntoMapa | null>(oficina ? { lat: oficina.lat, lng: oficina.lng } : null);
  const [radio, setRadio] = useState(String(oficina?.radio ?? RADIO_OFICINA.porDefecto));
  const [centrar, setCentrar] = useState<PuntoMapa | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [isPending, startTransition] = useTransition();

  const radioNumero = Math.round(Number(radio));
  const radioValido = Number.isFinite(radioNumero) && radioNumero >= RADIO_OFICINA.min && radioNumero <= RADIO_OFICINA.max;

  async function usarMiUbicacion() {
    setBuscando(true);
    const l = await obtenerPosicion();
    setBuscando(false);
    if (!l.ok) {
      toast.error(MENSAJES_UBICACION[l.motivo]);
      return;
    }
    const p = { lat: l.pos.lat, lng: l.pos.lng };
    setPunto(p);
    setCentrar(p);
  }

  function guardar() {
    if (!punto || !radioValido) return;
    startTransition(async () => {
      const r = await guardarOficina({ latitud: punto.lat, longitud: punto.lng, radioMetros: radioNumero });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Oficina guardada en el mapa.");
      onClose();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>La oficina en el mapa</DialogTitle>
        <DialogDescription>
          Pulsa en el mapa donde está la oficina, o arrastra el punto. Dentro del círculo cuenta como «en la oficina».
        </DialogDescription>
      </DialogHeader>

      <Mapa
        zonas={zonas}
        oficina={punto ? { ...punto, radio: radioValido ? radioNumero : RADIO_OFICINA.porDefecto } : null}
        colocarOficina={setPunto}
        centrarEn={centrar}
        rueda
        className="h-[min(55dvh,26rem)]"
      />

      <div className="grid gap-4 sm:grid-cols-[12rem_1fr] sm:items-end">
        <Field
          label="Radio"
          htmlFor="oficina-radio"
          error={radioValido ? undefined : `Entre ${RADIO_OFICINA.min} y ${RADIO_OFICINA.max} m`}
        >
          <AffixInput
            id="oficina-radio"
            type="number"
            inputMode="numeric"
            min={RADIO_OFICINA.min}
            max={RADIO_OFICINA.max}
            step={10}
            suffix="m"
            value={radio}
            onChange={(e) => setRadio(e.target.value)}
            aria-invalid={!radioValido}
          />
        </Field>
        <Button type="button" variant="outline" className="sm:justify-self-start" disabled={buscando} onClick={usarMiUbicacion}>
          <LocateFixed /> {buscando ? "Buscando…" : "Estoy en la oficina: usar mi ubicación"}
        </Button>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" disabled={!punto || !radioValido || isPending} onClick={guardar}>
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

/** Place the office on the map and choose its radius (director only). */
export function OficinaMapaDialog(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MapPin /> {props.oficina ? "Cambiar" : "Marcar en el mapa"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
          {open && <OficinaForm {...props} onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
