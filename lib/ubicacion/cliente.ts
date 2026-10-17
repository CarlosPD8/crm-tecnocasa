import type { MotivoUbicacion, Posicion } from "@/lib/validations/ubicacion";

/**
 * Browser side of the location check: one bounded reading when a form opens or
 * saves, never tracking. Keeps the best fix for a few seconds and stops early
 * once it's good enough.
 */

export type Lectura = { ok: true; pos: Posicion; tomadaEn: number } | { ok: false; motivo: MotivoUbicacion };

/** Metres: good enough to stop waiting. */
const OBJETIVO = 35;
const ESPERA_MAX = 12_000;

function lectura(p: GeolocationPosition): Lectura {
  return {
    ok: true,
    pos: {
      lat: p.coords.latitude,
      lng: p.coords.longitude,
      precision: Math.max(1, p.coords.accuracy),
      edadMs: 0,
    },
    tomadaEn: p.timestamp,
  };
}

export function obtenerPosicion(): Promise<Lectura> {
  if (typeof navigator === "undefined" || !navigator.geolocation || !window.isSecureContext) {
    return Promise.resolve({ ok: false, motivo: "no-disponible" });
  }
  return new Promise((resolve) => {
    let mejor: GeolocationPosition | null = null;
    let terminado = false;

    // Both callbacks below run later (geolocation and timers are async), once
    // `vigilancia` and `limite` exist.
    const fin = (r: Lectura) => {
      if (terminado) return;
      terminado = true;
      navigator.geolocation.clearWatch(vigilancia);
      clearTimeout(limite);
      resolve(r);
    };
    const conLaMejor = () => fin(mejor ? lectura(mejor) : { ok: false, motivo: "tiempo-agotado" });

    const vigilancia = navigator.geolocation.watchPosition(
      (p) => {
        if (!mejor || p.coords.accuracy < mejor.coords.accuracy) mejor = p;
        if (p.coords.accuracy <= OBJETIVO) conLaMejor();
      },
      (e) => {
        if (e.code === e.PERMISSION_DENIED) fin({ ok: false, motivo: "denegada" });
        else if (e.code === e.POSITION_UNAVAILABLE && !mejor) fin({ ok: false, motivo: "no-disponible" });
        // A timeout just means no better fix: the limit below answers with the best one.
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: ESPERA_MAX }
    );
    const limite = setTimeout(conLaMejor, ESPERA_MAX);
  });
}

/** The position as sent to the server, with its age measured now. */
export function posicionAEnviar(l: Extract<Lectura, { ok: true }>): Posicion {
  return { ...l.pos, edadMs: Math.max(0, Math.round(Date.now() - l.tomadaEn)) };
}

export type Plataforma = "iphone" | "android" | "ordenador";

export function plataforma(): Plataforma {
  if (typeof navigator === "undefined") return "ordenador";
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch gives it away.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "iphone";
  if (/Android/.test(ua)) return "android";
  return "ordenador";
}

/** How to let this site see the location, on this device. */
export const AYUDA_PERMISO: Record<Plataforma, string> = {
  iphone:
    "En el iPhone: Ajustes › Privacidad y seguridad › Localización, actívala y en «Sitios web de Safari» elige «Al usar la app» con «Ubicación exacta». Después recarga la página y permite la ubicación.",
  android:
    "En Android: toca el icono a la izquierda de la dirección › Permisos › Ubicación › Permitir, y recarga. Comprueba también que la ubicación del móvil está activada y en modo preciso.",
  ordenador:
    "En el ordenador: pulsa el icono a la izquierda de la dirección › Ubicación › Permitir, y recarga. Si estás en la oficina, pide al director que marque la red de la oficina.",
};
