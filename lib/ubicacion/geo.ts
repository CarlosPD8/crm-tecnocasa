/**
 * Plain geometry on WGS84 coordinates, good for the few kilometres a zone or
 * an office covers. No dependencies: shared by the server, tests and the map.
 */

export type Punto = { lat: number; lng: number };

/** A polygon ring as GeoJSON stores it: [lng, lat] positions (closed or not). */
export type Anillo = readonly (readonly [number, number])[];

const RADIO_TIERRA = 6_371_000;
const rad = (grados: number) => (grados * Math.PI) / 180;

/** Great-circle distance (haversine), in metres. */
export function distanciaMetros(a: Punto, b: Punto) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Even-odd ray casting. A point right on an edge may land on either side:
 * callers add a margin with `distanciaAlBordeMetros`.
 */
export function puntoEnPoligono(p: Punto, anillo: Anillo) {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

/**
 * Distance from the point to the ring's border, in metres. Projects locally
 * around the point (equirectangular), which is exact enough at zone scale.
 */
export function distanciaAlBordeMetros(p: Punto, anillo: Anillo) {
  const mx = rad(1) * RADIO_TIERRA * Math.cos(rad(p.lat));
  const my = rad(1) * RADIO_TIERRA;
  let minima = Infinity;
  for (let i = 0; i < anillo.length; i++) {
    const a = anillo[i];
    const b = anillo[(i + 1) % anillo.length];
    minima = Math.min(
      minima,
      distanciaAlSegmento((a[0] - p.lng) * mx, (a[1] - p.lat) * my, (b[0] - p.lng) * mx, (b[1] - p.lat) * my)
    );
  }
  return minima;
}

/** Distance from the origin to the segment AB (plane coordinates). */
function distanciaAlSegmento(ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const largo2 = dx * dx + dy * dy;
  const t = largo2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / largo2)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}
