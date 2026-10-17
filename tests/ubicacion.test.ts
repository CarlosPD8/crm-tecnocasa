// Location control without a database: geometry, IPs and networks, where an
// advisor is (lib/ubicacion/*) and the shapes the browser sends.

import { describe, expect, it } from "vitest";
import { distanciaAlBordeMetros, distanciaMetros, puntoEnPoligono } from "@/lib/ubicacion/geo";
import { esIpPublica, ipDeCabeceras, ipEnRedes, redDeIp } from "@/lib/ubicacion/red";
import { LUGAR_OFICINA, LUGAR_RED, resolverLugar, type DatosOficina } from "@/lib/ubicacion/lugar";
import { formaZonaSchema, posicionSchema, type Posicion } from "@/lib/validations/ubicacion";

// About 111 m per thousandth of a degree of latitude.
const M = 0.001 / 111.195;

// A square zone in Granada: lng -3.60…-3.59, lat 37.17…37.18.
const CUADRADO: [number, number][] = [
  [-3.6, 37.17],
  [-3.59, 37.17],
  [-3.59, 37.18],
  [-3.6, 37.18],
  [-3.6, 37.17],
];
const forma = (anillo: [number, number][]) => ({ type: "Polygon", coordinates: [anillo] });

describe("geometría", () => {
  it("distancia en metros", () => {
    expect(distanciaMetros({ lat: 37.17, lng: -3.6 }, { lat: 37.171, lng: -3.6 })).toBeCloseTo(111.2, 0);
    expect(distanciaMetros({ lat: 37.17, lng: -3.6 }, { lat: 37.17, lng: -3.6 })).toBe(0);
  });

  it("punto en un polígono cóncavo (una L)", () => {
    const ele: [number, number][] = [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2], [0, 0]];
    expect(puntoEnPoligono({ lng: 0.5, lat: 0.5 }, ele)).toBe(true);
    expect(puntoEnPoligono({ lng: 1.5, lat: 0.5 }, ele)).toBe(true);
    expect(puntoEnPoligono({ lng: 0.5, lat: 1.5 }, ele)).toBe(true);
    expect(puntoEnPoligono({ lng: 1.5, lat: 1.5 }, ele)).toBe(false);
    expect(puntoEnPoligono({ lng: 3, lat: 0.5 }, ele)).toBe(false);
  });

  it("acepta anillos sin cerrar", () => {
    expect(puntoEnPoligono({ lng: -3.595, lat: 37.175 }, CUADRADO.slice(0, 4))).toBe(true);
  });

  it("distancia al borde", () => {
    expect(distanciaAlBordeMetros({ lng: -3.595, lat: 37.17 - 100 * M }, CUADRADO)).toBeCloseTo(100, 0);
    // Inside, 0.001° from the west edge: cos(37.17°) × 111 m.
    expect(distanciaAlBordeMetros({ lng: -3.599, lat: 37.175 }, CUADRADO)).toBeCloseTo(88.6, 0);
    // A corner: the closest point is the vertex.
    const d = distanciaAlBordeMetros({ lng: -3.6, lat: 37.17 - 30 * M }, CUADRADO);
    expect(d).toBeCloseTo(30, 0);
  });
});

describe("IP y redes", () => {
  const cabeceras = (h: Record<string, string>) => (n: string) => h[n] ?? null;

  it("lee la IP de las cabeceras de Vercel", () => {
    expect(ipDeCabeceras(cabeceras({ "x-real-ip": "81.32.10.4", "x-forwarded-for": "1.1.1.1" }))).toBe("81.32.10.4");
    expect(ipDeCabeceras(cabeceras({ "x-forwarded-for": "81.32.10.4, 10.0.0.1" }))).toBe("81.32.10.4");
    expect(ipDeCabeceras(cabeceras({ "x-real-ip": "::ffff:81.32.10.4" }))).toBe("81.32.10.4");
    expect(ipDeCabeceras(cabeceras({ "x-real-ip": "2A01:4F8::1" }))).toBe("2a01:4f8::1");
    expect(ipDeCabeceras(cabeceras({ "x-real-ip": "nada" }))).toBeNull();
    expect(ipDeCabeceras(cabeceras({}))).toBeNull();
  });

  it("guarda la IPv4 exacta y el /64 de una IPv6", () => {
    expect(redDeIp("81.32.10.4")).toBe("81.32.10.4");
    expect(redDeIp("2a01:04f8:0001:0002:aaaa:bbbb:cccc:dddd")).toBe("2a01:4f8:1:2::/64");
    expect(redDeIp("2a01:4f8:1:2::1")).toBe("2a01:4f8:1:2::/64");
    expect(redDeIp("2a01:4f8::1")).toBe("2a01:4f8:0:0::/64");
    expect(redDeIp("1:2:3:4:5:6:7")).toBeNull();
    expect(redDeIp("1::2::3")).toBeNull();
    expect(redDeIp("300.1.1.1")).toBeNull();
  });

  it("reconoce la red aunque el dispositivo cambie el final de su IPv6", () => {
    const redes = ["81.32.10.4", "2a01:4f8:1:2::/64"];
    expect(ipEnRedes("81.32.10.4", redes)).toBe(true);
    expect(ipEnRedes("81.32.10.5", redes)).toBe(false);
    expect(ipEnRedes("2a01:4f8:1:2:9999::7", redes)).toBe(true);
    expect(ipEnRedes("2a01:4f8:1:3::7", redes)).toBe(false);
    expect(ipEnRedes(null, redes)).toBe(false);
  });

  it("solo una IP pública identifica la oficina", () => {
    for (const ip of ["81.32.10.4", "2a01:4f8:1:2::1"]) expect(esIpPublica(ip), ip).toBe(true);
    for (const ip of [
      "10.1.2.3", "172.20.0.1", "192.168.1.10", "127.0.0.1", "169.254.1.1", "100.70.1.1", "0.0.0.0",
      "::1", "fe80::1", "fd00::1", "::", "basura",
    ]) {
      expect(esIpPublica(ip), ip).toBe(false);
    }
  });
});

describe("dónde está el asesor", () => {
  const OFICINA: DatosOficina = { latitud: 37.175, longitud: -3.595, radioMetros: 150, redes: ["81.32.10.4"] };
  const ZAIDIN = { nombre: "Zaidín", forma: forma(CUADRADO) };
  const OTRA = {
    nombre: "Centro",
    forma: forma([[-3.58, 37.17], [-3.57, 37.17], [-3.57, 37.18], [-3.58, 37.18], [-3.58, 37.17]]),
  };
  const pos = (lat: number, lng: number, precision = 10): Posicion => ({ lat, lng, precision, edadMs: 0 });
  const donde = (p: Posicion | null, extra: Partial<Parameters<typeof resolverLugar>[0]> = {}) =>
    resolverLugar({ ip: "88.1.1.1", pos: p, oficina: OFICINA, zonas: [ZAIDIN, OTRA], ...extra });

  it("la red de la oficina no necesita GPS", () => {
    expect(donde(null, { ip: "81.32.10.4" })).toEqual({ ok: true, lugar: LUGAR_RED, via: "red" });
  });

  it("sin posición, o con mala señal, no se puede", () => {
    expect(donde(null)).toMatchObject({ ok: false, motivo: "sin-ubicacion" });
    expect(donde(pos(37.175, -3.595, 2000))).toMatchObject({ ok: false, motivo: "imprecisa" });
    expect(donde(pos(37.175, -3.595, 300))).toMatchObject({ ok: false, motivo: "senal-debil" });
  });

  it("la oficina va antes que la zona que la contiene", () => {
    expect(donde(pos(37.175 + 100 * M, -3.595))).toMatchObject({ ok: true, lugar: LUGAR_OFICINA, via: "oficina", metros: 100 });
  });

  it("dentro de una de sus zonas", () => {
    expect(donde(pos(37.171, -3.599))).toEqual({ ok: true, lugar: "Zaidín", via: "zona" });
    expect(donde(pos(37.175, -3.575))).toEqual({ ok: true, lugar: "Centro", via: "zona" });
  });

  it("junto al borde, con un margen según la precisión (como mucho 50 m)", () => {
    const fuera40 = 37.17 - 40 * M;
    expect(donde(pos(fuera40, -3.597, 45))).toMatchObject({ ok: true, lugar: "Zaidín" });
    expect(donde(pos(fuera40, -3.597, 20))).toMatchObject({ ok: false, motivo: "fuera" });
    expect(donde(pos(37.17 - 70 * M, -3.597, 140))).toMatchObject({ ok: false, motivo: "fuera" });
  });

  it("el radio de la oficina también tiene margen", () => {
    expect(donde(pos(37.175 + 180 * M, -3.595, 40))).toMatchObject({ ok: true, lugar: LUGAR_OFICINA });
    expect(donde(pos(37.175 + 180 * M, -3.595, 20))).toMatchObject({ ok: true, lugar: "Zaidín" });
  });

  it("fuera de todo", () => {
    expect(donde(pos(37.2, -3.6))).toMatchObject({
      ok: false,
      motivo: "fuera",
      mensaje: "Estás fuera de tu zona y de la oficina. Podrás registrarlo cuando vuelvas.",
    });
  });

  it("explica por qué si no tiene zonas o no están dibujadas", () => {
    const sinZonas = donde(pos(37.2, -3.6), { zonas: [] });
    expect(sinZonas).toMatchObject({ ok: false, motivo: "fuera" });
    expect(!sinZonas.ok && sinZonas.mensaje).toMatch(/no tienes zona asignada/);

    const sinDibujar = donde(pos(37.171, -3.599), { zonas: [{ nombre: "Zaidín", forma: null }] });
    expect(sinDibujar).toMatchObject({ ok: false, motivo: "fuera" });
    expect(!sinDibujar.ok && sinDibujar.mensaje).toMatch(/aún no están dibujadas/);
  });

  it("sin la oficina en el mapa solo cuentan las zonas", () => {
    const sinPunto = { ...OFICINA, latitud: null, longitud: null };
    expect(donde(pos(37.175, -3.595), { oficina: sinPunto })).toMatchObject({ ok: true, lugar: "Zaidín" });
  });
});

describe("validación", () => {
  it("contorno: anillo cerrado, al menos tres puntos, redondeado", () => {
    const ok = formaZonaSchema.safeParse(forma([[-3.6000001234, 37.17], ...CUADRADO.slice(1, 4), [-3.6000001234, 37.17]]));
    expect(ok.success && ok.data.coordinates[0][0]).toEqual([-3.6, 37.17]);
    expect(formaZonaSchema.safeParse(forma(CUADRADO.slice(0, 4))).success).toBe(false);
    expect(formaZonaSchema.safeParse(forma([[0, 0], [1, 0], [0, 0]])).success).toBe(false);
    expect(formaZonaSchema.safeParse({ type: "MultiPolygon", coordinates: [CUADRADO] }).success).toBe(false);
    expect(formaZonaSchema.safeParse(forma([[200, 0], [1, 0], [1, 1], [200, 0]])).success).toBe(false);
  });

  it("posición: sin campos de más y reciente", () => {
    const p = { lat: 37.17, lng: -3.6, precision: 12, edadMs: 1000 };
    expect(posicionSchema.safeParse(p).success).toBe(true);
    expect(posicionSchema.safeParse({ ...p, edadMs: 3 * 60 * 1000 }).success).toBe(false);
    expect(posicionSchema.safeParse({ ...p, precision: 0 }).success).toBe(false);
    expect(posicionSchema.safeParse({ ...p, altura: 3 }).success).toBe(false);
  });
});
