"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./mapa.css";

import { cn } from "@/lib/utils";
import { MAPA } from "@/lib/mapa";
import type { FormaZona } from "@/lib/validations/ubicacion";

export type ZonaMapa = {
  id: string;
  nombre: string;
  /** CSS color (the palette's value, not its key). */
  color: string;
  forma: FormaZona | null;
};

export type PuntoMapa = { lat: number; lng: number };

export type PropsMapa = {
  zonas: ZonaMapa[];
  oficina?: (PuntoMapa & { radio: number }) | null;
  /**
   * Drawing one zone's contour: the others are faded. `reinicio` changes to
   * throw the drawing away and start again.
   */
  dibujar?: { zonaId: string; reinicio: number; onChange: (forma: FormaZona | null) => void };
  /** Placing the office: click the map or drag the pin. */
  colocarOficina?: (p: PuntoMapa) => void;
  /** Moves the view there when it changes («Usar mi ubicación»). */
  centrarEn?: PuntoMapa | null;
  /** Zoom with the mouse wheel (off on a page, so scrolling isn't hijacked). */
  rueda?: boolean;
  className?: string;
};

const ESPANA: L.LatLngTuple = [40.2, -3.7];
const OFICINA = "oklch(0.42 0.06 250)";

const aLatLngs = (forma: FormaZona) =>
  forma.coordinates[0].slice(0, -1).map(([lng, lat]): L.LatLngTuple => [lat, lng]);

function aForma(capa: L.Polygon): FormaZona | null {
  const g = capa.toGeoJSON().geometry;
  // The server validates and rounds it (formaZonaSchema).
  return g.type === "Polygon" ? (g as unknown as FormaZona) : null;
}

/**
 * Leaflet map with OpenStreetMap tiles, the office's zones and the office.
 * Client only: load it through `Mapa` (components/mapa/mapa.tsx).
 */
export default function MapaLeaflet({
  zonas,
  oficina,
  dibujar,
  colocarOficina,
  centrarEn,
  rueda = false,
  className,
}: PropsMapa) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [mapa, setMapa] = useState<L.Map | null>(null);
  const conDibujo = Boolean(dibujar);

  // Latest callbacks and zones, for handlers that live longer than a render.
  const ultimo = useRef({ zonas, alCambiar: dibujar?.onChange, colocarOficina });
  useEffect(() => {
    ultimo.current = { zonas, alCambiar: dibujar?.onChange, colocarOficina };
  });

  useEffect(() => {
    let vivo = true;
    let creado: L.Map | null = null;
    let observador: ResizeObserver | null = null;
    void (async () => {
      // Geoman hooks into the map constructor: it has to be there first.
      if (conDibujo) await (await import("./dibujo")).cargarDibujo();
      if (!vivo || !contenedor.current) return;
      creado = L.map(contenedor.current, { scrollWheelZoom: rueda, zoomSnap: 0.5 });
      creado.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noreferrer">Leaflet</a>');
      L.tileLayer(MAPA.teselas, { attribution: MAPA.atribucion, maxZoom: MAPA.zoomMax }).addTo(creado);
      creado.setView(ESPANA, 6);
      const m = creado;
      observador = new ResizeObserver(() => m.invalidateSize());
      observador.observe(contenedor.current);
      setMapa(creado);
    })();
    return () => {
      vivo = false;
      observador?.disconnect();
      creado?.remove();
      setMapa(null);
    };
  }, [conDibujo, rueda]);

  // First view: the zones and the office, or Spain.
  const encuadrado = useRef(false);
  useEffect(() => {
    if (!mapa || encuadrado.current) return;
    encuadrado.current = true;
    const puntos = zonas.flatMap((z) => (z.forma ? aLatLngs(z.forma) : []));
    if (oficina) puntos.push([oficina.lat, oficina.lng]);
    if (puntos.length > 1) mapa.fitBounds(L.latLngBounds(puntos), { padding: [24, 24], maxZoom: 16 });
    else if (puntos.length === 1) mapa.setView(puntos[0], 15);
  }, [mapa, zonas, oficina]);

  useEffect(() => {
    if (mapa && centrarEn) mapa.setView([centrarEn.lat, centrarEn.lng], Math.max(mapa.getZoom(), 16));
  }, [mapa, centrarEn]);

  // The zones (except the one being drawn), with their names.
  const zonaDibujo = dibujar?.zonaId;
  useEffect(() => {
    if (!mapa) return;
    const grupo = L.featureGroup().addTo(mapa);
    const atenuadas = Boolean(zonaDibujo);
    for (const z of zonas) {
      if (!z.forma || z.id === zonaDibujo) continue;
      L.polygon(aLatLngs(z.forma), {
        color: z.color,
        fillColor: z.color,
        weight: 2,
        opacity: atenuadas ? 0.45 : 0.9,
        fillOpacity: atenuadas ? 0.06 : 0.16,
        interactive: false,
        pmIgnore: true,
      })
        .bindTooltip(z.nombre, { permanent: true, direction: "center", className: "mapa-etiqueta" })
        .addTo(grupo);
    }
    return () => {
      grupo.remove();
    };
  }, [mapa, zonas, zonaDibujo]);

  // The office: its radius and a pin (draggable while placing it).
  const lat = oficina?.lat;
  const lng = oficina?.lng;
  const radio = oficina?.radio;
  const colocando = Boolean(colocarOficina);
  useEffect(() => {
    if (!mapa || lat === undefined || lng === undefined || radio === undefined) return;
    const circulo = L.circle([lat, lng], {
      radius: radio,
      color: OFICINA,
      weight: 1.5,
      dashArray: "5 5",
      fillOpacity: 0.08,
      interactive: false,
      pmIgnore: true,
    }).addTo(mapa);
    const pin = L.marker([lat, lng], {
      icon: L.divIcon({ className: "mapa-oficina", html: "<span></span>", iconSize: [18, 18] }),
      draggable: colocando,
      keyboard: false,
      pmIgnore: true,
    })
      .bindTooltip("Oficina", { direction: "top", offset: [0, -10] })
      .addTo(mapa);
    pin.on("dragend", () => {
      const p = pin.getLatLng();
      ultimo.current.colocarOficina?.({ lat: p.lat, lng: p.lng });
    });
    return () => {
      circulo.remove();
      pin.remove();
    };
  }, [mapa, lat, lng, radio, colocando]);

  useEffect(() => {
    if (!mapa || !colocando) return;
    const alPulsar = (e: L.LeafletMouseEvent) => ultimo.current.colocarOficina?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    mapa.on("click", alPulsar);
    mapa.getContainer().classList.add("mapa-colocando");
    return () => {
      mapa.off("click", alPulsar);
      mapa.getContainer().classList.remove("mapa-colocando");
    };
  }, [mapa, colocando]);

  // Drawing: edit the saved contour, or draw a new one point by point.
  const reinicio = dibujar?.reinicio ?? 0;
  useEffect(() => {
    if (!mapa || !zonaDibujo || !mapa.pm) return;
    let vivo = true;
    let capa: L.Polygon | null = null;
    const zona = ultimo.current.zonas.find((z) => z.id === zonaDibujo);
    const color = zona?.color ?? OFICINA;
    const avisar = () => ultimo.current.alCambiar?.(capa ? aForma(capa) : null);
    const editar = (p: L.Polygon) => {
      capa = p;
      p.pm.enable({ allowSelfIntersection: false, removeVertexOn: "contextmenu" });
      p.on("pm:edit", avisar);
    };

    void import("./dibujo").then(({ TEXTOS_DIBUJO }) => {
      if (!vivo) return;
      mapa.pm.setLang("es", TEXTOS_DIBUJO, "es");
      mapa.pm.setGlobalOptions({
        allowSelfIntersection: false,
        snappable: false,
        pathOptions: { color, fillColor: color, fillOpacity: 0.2, weight: 2 },
        templineStyle: { color },
        hintlineStyle: { color, dashArray: "4 4" },
      });
      if (zona?.forma && reinicio === 0) {
        const p = L.polygon(aLatLngs(zona.forma), { color, fillColor: color, fillOpacity: 0.2, weight: 2 }).addTo(mapa);
        editar(p);
        mapa.fitBounds(p.getBounds(), { padding: [32, 32], maxZoom: 17 });
      } else {
        mapa.pm.enableDraw("Polygon", { allowSelfIntersection: false });
        mapa.once("pm:create", (e) => {
          editar(e.layer as L.Polygon);
          avisar();
        });
      }
    });

    return () => {
      vivo = false;
      mapa.pm.disableDraw();
      mapa.off("pm:create");
      capa?.pm.disable();
      capa?.remove();
    };
  }, [mapa, zonaDibujo, reinicio]);

  return (
    <div
      ref={contenedor}
      // `isolate`: Leaflet's panes use z-indexes up to 1000; keep them under the sticky bar and popovers.
      className={cn("isolate z-0 h-80 w-full overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/6", className)}
    />
  );
}
