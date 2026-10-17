import L from "leaflet";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

/**
 * Loads Geoman (polygon drawing and editing) only for the director's drawing
 * dialog. It attaches to the global `L` and hooks into the map constructor, so
 * it must load before the map is created.
 */
export async function cargarDibujo() {
  (globalThis as { L?: typeof L }).L = L;
  await import("@geoman-io/leaflet-geoman-free");
}

export const TEXTOS_DIBUJO = {
  tooltips: {
    firstVertex: "Pulsa en el mapa para poner el primer punto del borde",
    continueLine: "Sigue pulsando por el borde de la zona",
    finishPoly: "Pulsa el primer punto para cerrar el contorno",
  },
};
