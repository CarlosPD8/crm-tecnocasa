"use client";

import * as React from "react";
import { toast } from "sonner";

import { consultarLugar } from "@/lib/actions/ubicacion";
import { obtenerPosicion, posicionAEnviar, type Lectura } from "@/lib/ubicacion/cliente";
import {
  MENSAJES_UBICACION,
  type FalloUbicacion,
  type MotivoUbicacion,
  type Posicion,
  type UbicacionEnviada,
} from "@/lib/validations/ubicacion";

/**
 * Location control in the browser (point 4). With the control on (an advisor
 * in an office that has it), forms check where the user is when they open and
 * again on save; the server decides (lib/ubicacion/lugar.ts). Nothing is
 * tracked: the GPS is asked only at those moments. For everyone else this is
 * a pass-through.
 */

export type EstadoUbicacion =
  | { tipo: "libre" }
  | { tipo: "pendiente" }
  | { tipo: "comprobando" }
  | { tipo: "ok"; lugar?: string }
  | { tipo: "bloqueado"; motivo: MotivoUbicacion; mensaje: string };

/** An action's result without the location failure, which `guardar` handles. */
export type SinFallo<R> = Exclude<R, FalloUbicacion>;

type Guardar = <R>(accion: (ub: UbicacionEnviada) => Promise<R>) => Promise<SinFallo<R> | null>;

type Valor = {
  control: boolean;
  estado: EstadoUbicacion;
  comprobar: (forzar?: boolean) => Promise<void>;
  guardar: Guardar;
};

/** A check is reused this long: several forms on a page, or reopening one. */
const VIGENCIA = 60_000;
/** A fix this recent is sent again on save instead of asking the GPS anew. */
const REUSAR_POSICION = 30_000;

const enviar = (pos: Posicion | null) => ({ pos }) as UbicacionEnviada;

function esFallo(r: unknown): r is FalloUbicacion {
  return typeof r === "object" && r !== null && "ubicacion" in r && (r as { success?: unknown }).success === false;
}

const SIN_CONTROL: Valor = {
  control: false,
  estado: { tipo: "libre" },
  comprobar: async () => {},
  guardar: async (accion) => (await accion(enviar(null))) as never,
};

const UbicacionContext = React.createContext<Valor>(SIN_CONTROL);

export function UbicacionProvider({
  control: controlInicial,
  redOficina,
  children,
}: {
  /** Hints from the layout; the server checks every save anyway. */
  control: boolean;
  redOficina: boolean;
  children: React.ReactNode;
}) {
  const [control, setControl] = React.useState(controlInicial);
  const [estado, setEstado] = React.useState<EstadoUbicacion>(
    controlInicial ? { tipo: "pendiente" } : { tipo: "libre" }
  );
  // The layout re-renders with a new hint after the director changes the switch.
  const [previo, setPrevio] = React.useState(controlInicial);
  if (previo !== controlInicial) {
    setPrevio(controlInicial);
    setControl(controlInicial);
    setEstado(controlInicial ? { tipo: "pendiente" } : { tipo: "libre" });
  }

  const comprobadoEn = React.useRef(0);
  const ultimaLectura = React.useRef<Extract<Lectura, { ok: true }> | null>(null);
  const enCurso = React.useRef<Promise<void> | null>(null);

  const leer = React.useCallback(async (): Promise<Lectura> => {
    const ultima = ultimaLectura.current;
    if (ultima && Date.now() - ultima.tomadaEn < REUSAR_POSICION) return ultima;
    const l = await obtenerPosicion();
    ultimaLectura.current = l.ok ? l : null;
    return l;
  }, []);

  const bloquear = React.useCallback((motivo: MotivoUbicacion, mensaje = MENSAJES_UBICACION[motivo]) => {
    comprobadoEn.current = Date.now();
    setEstado({ tipo: "bloqueado", motivo, mensaje });
    return mensaje;
  }, []);

  const comprobar = React.useCallback(
    async (forzar = false) => {
      if (!control) return;
      if (enCurso.current) return enCurso.current;
      if (!forzar && Date.now() - comprobadoEn.current < VIGENCIA) return;
      if (forzar) ultimaLectura.current = null;

      const tarea = (async () => {
        setEstado({ tipo: "comprobando" });
        let r = redOficina ? await consultarLugar(enviar(null)) : null;
        if (!r || (r.control && !r.ok && r.motivo === "sin-ubicacion")) {
          const l = await leer();
          if (!l.ok) {
            bloquear(l.motivo);
            return;
          }
          r = await consultarLugar(enviar(posicionAEnviar(l)));
        }
        comprobadoEn.current = Date.now();
        if (!r.control) {
          setControl(false);
          setEstado({ tipo: "libre" });
        } else if (r.ok) {
          setEstado({ tipo: "ok", lugar: r.lugar });
        } else {
          setEstado({ tipo: "bloqueado", motivo: r.motivo, mensaje: r.mensaje });
        }
      })();
      enCurso.current = tarea;
      try {
        await tarea;
      } catch {
        // No connection: the save will check again.
        setEstado({ tipo: "pendiente" });
      } finally {
        enCurso.current = null;
      }
    },
    [control, redOficina, leer, bloquear]
  );

  const guardar = React.useCallback<Guardar>(
    async (accion) => {
      let controlado = control;
      let pos: Posicion | null = null;
      const conPosicion = async () => {
        const l = await leer();
        if (!l.ok) {
          toast.error(bloquear(l.motivo));
          return false;
        }
        pos = posicionAEnviar(l);
        return true;
      };

      if (controlado && !redOficina && !(await conPosicion())) return null;
      let r = await accion(enviar(pos));
      // The control was just turned on, or this isn't the office network after
      // all: once more with the GPS. Safe, the check runs before any write.
      if (esFallo(r) && r.ubicacion === "sin-ubicacion" && pos === null) {
        if (!controlado) {
          controlado = true;
          setControl(true);
        }
        if (!(await conPosicion())) return null;
        r = await accion(enviar(pos));
      }
      if (esFallo(r)) {
        toast.error(bloquear(r.ubicacion, r.error));
        return null;
      }
      if (controlado) {
        comprobadoEn.current = Date.now();
        setEstado((e) => (e.tipo === "ok" ? e : { tipo: "ok" }));
      }
      return r as SinFallo<typeof r>;
    },
    [control, redOficina, leer, bloquear]
  );

  const valor = React.useMemo(
    () => ({ control, estado, comprobar, guardar }),
    [control, estado, comprobar, guardar]
  );
  return <UbicacionContext.Provider value={valor}>{children}</UbicacionContext.Provider>;
}

/**
 * For any component that saves data.
 * - `alAbrir`: check as soon as it mounts (page forms, dialogs).
 * - Otherwise spread `alInteractuar` on its container: it checks on the first
 *   touch or key press (forms inside a record's page, so viewing it asks nothing),
 *   or call `iniciar` from the right event.
 * - Wrap every write action call in `guardar`: it returns null when the
 *   location doesn't allow it (the toast and the banner say why).
 */
export function useLugar({ alAbrir = false }: { alAbrir?: boolean } = {}) {
  const { control, estado, comprobar, guardar } = React.useContext(UbicacionContext);

  React.useEffect(() => {
    if (alAbrir && control) void comprobar();
  }, [alAbrir, control, comprobar]);

  const iniciar = React.useCallback(() => {
    if (control) void comprobar();
  }, [control, comprobar]);
  const alInteractuar = React.useMemo(
    () => ({ onPointerDownCapture: iniciar, onKeyDownCapture: iniciar }),
    [iniciar]
  );

  const reintentar = React.useCallback(() => comprobar(true), [comprobar]);

  return {
    estado,
    bloqueado: estado.tipo === "bloqueado",
    comprobando: estado.tipo === "comprobando",
    guardar,
    reintentar,
    /** Starts a check now (reusing a recent one), e.g. when a drag starts. */
    iniciar,
    alInteractuar,
  };
}

export type LugarFormulario = ReturnType<typeof useLugar>;
