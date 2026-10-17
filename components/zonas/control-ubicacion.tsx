"use client";

import { useState, useTransition } from "react";
import { CircleAlert, CircleCheck, LocateFixed, MapPinned, Wifi, X } from "lucide-react";
import { toast } from "sonner";

import {
  cambiarControlUbicacion,
  marcarRedOficina,
  probarUbicacion,
  quitarRedOficina,
} from "@/lib/actions/ubicacion";
import { obtenerPosicion, posicionAEnviar } from "@/lib/ubicacion/cliente";
import type { Lugar } from "@/lib/ubicacion/lugar";
import type { UbicacionEnviada } from "@/lib/validations/ubicacion";
import { cn } from "@/lib/utils";
import type { PuntoMapa, ZonaMapa } from "@/components/mapa/mapa";
import { OficinaMapaDialog } from "@/components/zonas/oficina-mapa-dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type DatosControl = {
  activo: boolean;
  /** «16/10/2026», when it was turned on. */
  desde: string | null;
  oficina: (PuntoMapa & { radio: number }) | null;
  redes: string[];
  /** The network of this request (null in local development) and whether it can be stored. */
  redActual: { red: string | null; publica: boolean };
  zonasSinContorno: string[];
  asesoresSinZona: string[];
  zonas: ZonaMapa[];
};

/** The director's position, when the browser gives it (the server ignores bad ones). */
async function posicionDirector(): Promise<UbicacionEnviada> {
  const l = await obtenerPosicion();
  return { pos: l.ok ? posicionAEnviar(l) : null } as UbicacionEnviada;
}

function textoLugarPrueba(lugar: Lugar, precision: number | null) {
  const con = precision ? ` (precisión de ${precision} m)` : "";
  if (!lugar.ok) return lugar.motivo === "fuera" ? "Fuera de la oficina y de todas las zonas." + con : lugar.mensaje;
  if (lugar.via === "red") return "En la red de la oficina: cuenta como oficina sin mirar el GPS.";
  if (lugar.via === "oficina") return `En la oficina, a ${lugar.metros} m del punto${con}.`;
  return `En la zona ${lugar.lugar}${con}.`;
}

function Paso({
  ok,
  aviso,
  titulo,
  children,
  accion,
}: {
  ok: boolean;
  /** A warning rather than a missing requirement. */
  aviso?: boolean;
  titulo: string;
  children: React.ReactNode;
  accion?: React.ReactNode;
}) {
  const Icono = ok ? CircleCheck : CircleAlert;
  return (
    <li className="flex flex-col gap-3 border-t border-border/70 py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-start">
      <Icono
        aria-hidden
        className={cn("mt-0.5 size-4 shrink-0", ok ? "text-primary" : aviso ? "text-warning" : "text-destructive")}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-medium">{titulo}</p>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
      {accion && <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{accion}</div>}
    </li>
  );
}

/**
 * The location control for the director: what it needs (office on the map,
 * networks, contours), a test of where the app places them, and the switch.
 */
export function ControlUbicacion(d: DatosControl) {
  const [isPending, startTransition] = useTransition();
  const [prueba, setPrueba] = useState<string | null>(null);
  const [probando, setProbando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [avisados, setAvisados] = useState(false);

  const redGuardada = d.redActual.red !== null && d.redes.includes(d.redActual.red);

  function marcarRed() {
    startTransition(async () => {
      const r = await marcarRedOficina(await posicionDirector());
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Red de la oficina guardada.");
    });
  }

  function quitarRed(red: string) {
    startTransition(async () => {
      const r = await quitarRedOficina(red);
      if (!r.success) toast.error(r.error);
    });
  }

  async function probar() {
    setProbando(true);
    try {
      const r = await probarUbicacion(await posicionDirector());
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      setPrueba(textoLugarPrueba(r.lugar, r.precision));
    } finally {
      setProbando(false);
    }
  }

  function cambiar(activo: boolean) {
    startTransition(async () => {
      const r = await cambiarControlUbicacion(activo, avisados);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      setConfirmar(false);
      setAvisados(false);
      toast.success(activo ? "Control de ubicación activado." : "Control de ubicación desactivado.");
    });
  }

  return (
    <section className="rise flex flex-col gap-5 rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/6 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <MapPinned aria-hidden className="size-4 text-muted-foreground" />
            Control de ubicación
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                d.activo ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              {d.activo ? `Activado${d.desde ? ` desde el ${d.desde}` : ""}` : "Desactivado"}
            </span>
          </h2>
          <p className="max-w-[70ch] text-sm text-muted-foreground">
            Activado, los asesores solo pueden guardar datos desde sus zonas o desde la oficina; consultar, siempre. La
            app mira dónde están solo al abrir un formulario y al guardar, y guarda únicamente el nombre del lugar. Tú
            puedes registrar desde cualquier sitio.
          </p>
        </div>
        {d.activo ? (
          <Button variant="outline" disabled={isPending} onClick={() => cambiar(false)}>
            Desactivar
          </Button>
        ) : (
          <Button disabled={!d.oficina || isPending} onClick={() => setConfirmar(true)}>
            Activar
          </Button>
        )}
      </div>

      <ul className="flex flex-col">
        <Paso
          ok={Boolean(d.oficina)}
          titulo="La oficina en el mapa"
          accion={<OficinaMapaDialog oficina={d.oficina} zonas={d.zonas} />}
        >
          {d.oficina
            ? `Marcada, con un radio de ${d.oficina.radio} m.`
            : "Sin marcar. Hace falta para activar el control."}
        </Paso>

        <Paso
          ok={d.redes.length > 0}
          aviso
          titulo="Red de la oficina"
          accion={
            d.redActual.publica &&
            !redGuardada && (
              <Button variant="outline" size="sm" disabled={isPending} onClick={marcarRed}>
                <Wifi /> Esta es la red de la oficina
              </Button>
            )
          }
        >
          <p>
            Para los ordenadores de la oficina, que no tienen GPS: lo que llegue por esta conexión cuenta como oficina.
            Márcala desde un equipo conectado a la red de la oficina (Wi-Fi o cable).
          </p>
          {d.redes.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {d.redes.map((red) => (
                <li
                  key={red}
                  className="flex items-center gap-1 rounded-md bg-surface py-0.5 pr-0.5 pl-2 font-mono text-xs text-foreground ring-1 ring-border"
                >
                  {red}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Quitar la red ${red}`}
                    disabled={isPending}
                    onClick={() => quitarRed(red)}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs">
            {d.redActual.red === null
              ? "No se puede leer la dirección de esta conexión."
              : !d.redActual.publica
                ? `Tu conexión (${d.redActual.red}) no tiene dirección propia en internet: no sirve para reconocer la oficina.`
                : redGuardada
                  ? `Tu conexión (${d.redActual.red}) es la de la oficina.`
                  : `Tu conexión ahora: ${d.redActual.red}.`}{" "}
            Si el operador cambia la dirección, vuelve a marcarla.
          </p>
        </Paso>

        <Paso ok={d.zonasSinContorno.length === 0} aviso titulo="Contornos de las zonas">
          {d.zonasSinContorno.length === 0
            ? "Todas las zonas tienen su contorno dibujado."
            : `Sin contorno: ${d.zonasSinContorno.join(", ")}. Sus asesores solo podrán registrar desde la oficina. Dibújalo con «Dibujar» en su tarjeta.`}
        </Paso>

        {d.asesoresSinZona.length > 0 && (
          <Paso ok={false} aviso titulo="Asesores sin zona">
            {d.asesoresSinZona.join(", ")} {d.asesoresSinZona.length === 1 ? "no tiene" : "no tienen"} zona: solo
            podrán registrar desde la oficina.
          </Paso>
        )}

        <Paso
          ok
          titulo="Comprobar dónde te sitúa la app"
          accion={
            <Button variant="outline" size="sm" disabled={probando} onClick={probar}>
              <LocateFixed /> {probando ? "Comprobando…" : "Comprobar dónde estoy"}
            </Button>
          }
        >
          {prueba ?? "Útil para revisar los contornos paseando por la zona. No se guarda nada."}
        </Paso>
      </ul>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Activar el control de ubicación?</AlertDialogTitle>
            <AlertDialogDescription>
              Desde ese momento, los asesores solo podrán guardar pisos, clientes, contactos, citas y documentos desde
              sus zonas o desde la oficina. La ley exige informarles por escrito antes de activarlo (art. 90 de la
              LOPDGDD).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              checked={avisados}
              onChange={(e) => setAvisados(e.target.checked)}
            />
            He informado por escrito a los asesores.
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button disabled={!avisados || isPending} onClick={() => cambiar(true)}>
              {isPending ? "Activando…" : "Activar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
