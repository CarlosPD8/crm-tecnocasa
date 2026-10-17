import { describe, expect, it } from "vitest";
import { cambioBloque, cambioInmueble, cambioZona, cuandoEvento, diaDe, euros, frase, textoLugar } from "@/lib/actividad";
import { consultaActividad } from "@/lib/filtros/consultas";
import { describirValor } from "@/lib/filtros/tipos";
import { FILTROS_ACTIVIDAD } from "@/lib/filtros/definiciones";

// 10:00 in Madrid on Wednesday 24 September 2026.
const AHORA = new Date("2026-09-24T08:00:00.000Z");

describe("frases del registro", () => {
  it("euros enteros y siempre agrupados, como la carga inicial en SQL", () => {
    expect(euros(198500)).toBe("198.500 €");
    expect(euros("7500.40")).toBe("7.500 €");
    expect(euros(750)).toBe("750 €");
  });

  it("un cambio dice antes y después; varios, solo los campos", () => {
    expect(frase.cambio("GR-2401", [{ campo: "Precio", articulo: "el", antes: "238.000 €", despues: "232.000 €" }])).toBe(
      "Cambió el precio de GR-2401: 238.000 € → 232.000 €"
    );
    expect(
      frase.cambio("GR-2401", [
        { campo: "Precio", antes: "1", despues: "2" },
        { campo: "Estado", antes: "a", despues: "b" },
        { campo: "Descripción", antes: null, despues: "c" },
      ])
    ).toBe("Editó GR-2401: precio, estado y descripción");
  });

  it("zonas: alta, cambios de asesores y borrado con traspaso", () => {
    expect(frase.altaZona("Pajaritos")).toBe("Creó la zona «Pajaritos»");
    expect(frase.bajaZona("Norte", "Centro", { bloques: 2, pisos: 30 })).toBe(
      "Borró la zona «Norte»; sus bloques y pisos pasan a «Centro»"
    );
    expect(frase.bajaZona("Vacía", "", { bloques: 0, pisos: 0 })).toBe("Borró la zona «Vacía»");
    const zona = {
      id: "z1", oficinaId: "o", nombre: "Pajaritos", color: "verde", notas: null, forma: null, creadoPorId: null,
      createdAt: AHORA, updatedAt: AHORA, asesores: [{ usuario: { nombre: "Marta" } }],
    };
    const linea = cambioZona(zona, { ...zona, asesores: [{ usuario: { nombre: "Bea" } }, { usuario: { nombre: "Marta" } }] });
    expect(linea?.resumen).toBe("Cambió los asesores de la zona «Pajaritos»: Marta → Bea, Marta");
  });

  it("ubicación: contornos, control, oficina y lugar", () => {
    expect(frase.formaZona("Zaidín", false, true)).toBe("Dibujó el contorno de la zona «Zaidín»");
    expect(frase.formaZona("Zaidín", true, true)).toBe("Cambió el contorno de la zona «Zaidín»");
    expect(frase.formaZona("Zaidín", true, false)).toBe("Borró el contorno de la zona «Zaidín»");
    expect(frase.controlUbicacion(true)).toMatch(/^Activó el control de ubicación/);
    expect(frase.controlUbicacion(false)).toBe("Desactivó el control de ubicación");
    expect(frase.oficinaEnMapa(150, false)).toBe("Marcó la oficina en el mapa (radio de 150 m)");
    expect(frase.oficinaEnMapa(200, true)).toBe("Cambió la oficina en el mapa (radio de 200 m)");
    expect(frase.redOficina("81.32.10.4")).toBe("Marcó la red de la oficina (81.32.10.4)");
    expect(frase.redOficina("81.32.10.4", true)).toBe("Quitó la red de la oficina 81.32.10.4");
    expect(textoLugar("Oficina")).toBe("En la oficina");
    expect(textoLugar("Red de la oficina")).toBe("Desde la red de la oficina");
    expect(textoLugar("Zaidín")).toBe("En Zaidín");
  });

  it("cambiar la zona de un bloque arrastra a sus pisos", () => {
    const bloque = {
      id: "b1", oficinaId: "o", calle: "C/ Gaviota", numero: "2", localidad: "Granada", nombre: null,
      codigoPostal: null, notas: null, zonaId: "z1", creadoPorId: null, createdAt: AHORA, updatedAt: AHORA,
      zona: { nombre: "General" },
    };
    const linea = cambioBloque(bloque, { ...bloque, zonaId: "z2", zona: { nombre: "Pajaritos" } }, 12);
    expect(linea?.resumen).toBe(
      "Cambió la zona del bloque C/ Gaviota 2: General → Pajaritos · sus 12 pisos pasan también a «Pajaritos»"
    );
  });

  it("contacto con persona, inmueble y próximo contacto", () => {
    expect(frase.contacto("Lucía Moreno", "GR-2401", new Date("2026-10-16T00:00:00.000Z"))).toBe(
      "Registró un contacto con Lucía Moreno sobre GR-2401 · próximo contacto el 16/10/2026"
    );
    expect(frase.contacto(null, "GR-2401")).toBe("Registró un contacto sobre GR-2401");
  });

  it("horas y días en España, no en la zona del servidor", () => {
    expect(cuandoEvento({ inicio: new Date("2026-10-16T08:00:00.000Z"), todoElDia: false })).toBe("16/10/2026 10:00");
    expect(cuandoEvento({ inicio: new Date("2026-10-16T00:00:00.000Z"), todoElDia: true })).toBe("16/10/2026");
    // 23:30 UTC on the 15th is already the 16th in Madrid.
    expect(diaDe(new Date("2026-10-15T23:30:00.000Z")).toISOString()).toBe("2026-10-16T00:00:00.000Z");
  });
});

describe("cambios de un inmueble", () => {
  const base = {
    id: "i1",
    oficinaId: "o",
    referencia: "GR-2414",
    direccion: "C/ Estrellas 22",
    localidad: "Granada",
    tipoInmueble: "PISO" as const,
    tipoOperacion: "ALQUILER" as const,
    precio: "650" as unknown as never,
    metrosCuadrados: 65,
    habitaciones: 2,
    banos: 1,
    descripcion: null,
    estado: "DISPONIBLE" as const,
    propietarioId: null,
    asesorId: null,
    creadoPorId: null,
    createdAt: AHORA,
    updatedAt: AHORA,
    zonaId: "z1",
    bloqueId: null,
    escalera: null,
    planta: 2,
    puerta: "D",
    ocupacion: null,
    captacion: null,
    fechaUltimoContacto: null,
    fechaProximoContacto: null,
    fechaFinAlquiler: null,
    propietario: null,
    bloque: null,
    zona: { nombre: "Centro" },
    asesor: null,
  };

  it("sin cambios no escribe nada", () => {
    expect(cambioInmueble(base, { ...base, updatedAt: new Date() })).toBeNull();
  });

  it("un cambio de estado se cuenta como «Pasó … a …»", () => {
    const linea = cambioInmueble(base, { ...base, estado: "RESERVADO" });
    expect(linea).toMatchObject({
      accion: "CAMBIO",
      enlace: "/inmuebles/i1",
      resumen: "Pasó GR-2414 a Reservado",
      cambios: [{ campo: "Estado", antes: "Disponible", despues: "Reservado" }],
    });
  });

  it("nombra a las personas en vez de dar ids", () => {
    const linea = cambioInmueble(base, {
      ...base,
      propietarioId: "c1",
      propietario: { nombre: "Manuel", apellidos: "Ortega" },
      captacion: "NOTICIA",
    });
    expect(linea?.cambios).toEqual([
      { campo: "Captación", antes: "Sin marca", despues: "Noticia" },
      { campo: "Propietario", antes: null, despues: "Manuel Ortega" },
    ]);
  });
});

describe("consulta de actividad", () => {
  it("sin filtro de fechas, los últimos 7 días", () => {
    const { where, dias } = consultaActividad({}, AHORA);
    expect(dias).toEqual({ desde: "2026-09-17", hasta: "2026-09-24" });
    expect(where.AND).toContainEqual({
      dia: { gte: new Date("2026-09-17T00:00:00.000Z"), lt: new Date("2026-09-25T00:00:00.000Z") },
    });
  });

  it("ayer, personas y tipos", () => {
    const { where } = consultaActividad({ fecha: "p:ayer", persona: "u1,u2", tipo: "CONTACTO,basura" }, AHORA);
    expect(where.AND).toContainEqual({
      dia: { gte: new Date("2026-09-23T00:00:00.000Z"), lt: new Date("2026-09-24T00:00:00.000Z") },
    });
    expect(where.AND).toContainEqual({ creadoPorId: { in: ["u1", "u2"] } });
    expect(where.AND).toContainEqual({ accion: { in: ["CONTACTO"] } });
  });

  it("nunca todo el historial, aunque pidan «sin fecha»", () => {
    expect(consultaActividad({ fecha: "p:sin" }, AHORA).dias).toEqual({ desde: "2026-09-17", hasta: "2026-09-24" });
  });

  it("el chip de fechas dice «Ayer»", () => {
    expect(describirValor(FILTROS_ACTIVIDAD.campos[0], "p:ayer")).toBe("Ayer");
  });
});
