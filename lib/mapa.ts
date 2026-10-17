/**
 * Map tiles. OpenStreetMap's are free for a small app like this one if its
 * attribution is shown and nothing is downloaded in advance; there's no
 * guarantee, so the provider can be changed with these variables (e.g.
 * MapTiler: https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=…).
 */
export const MAPA = {
  teselas: process.env.NEXT_PUBLIC_MAPA_TESELAS || "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  atribucion:
    process.env.NEXT_PUBLIC_MAPA_ATRIBUCION ||
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
  zoomMax: 19,
} as const;
