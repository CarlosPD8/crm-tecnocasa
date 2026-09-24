import { describe, expect, it } from "vitest";
import { condicionFecha, describirValor, hoyISO, leerFecha, leerMulti, leerRango } from "@/lib/filtros/tipos";
import { FILTROS_INMUEBLES, SIN_ASESOR, opcionesFiltroAsesor } from "@/lib/filtros/definiciones";
import { consultaClientes, consultaInmuebles } from "@/lib/filtros/consultas";

// 10:00 in Madrid on Wednesday 24 September 2026.
const AHORA = new Date("2026-09-24T08:00:00.000Z");

describe("fechas", () => {
  it("usa el día de Madrid, no el del servidor", () => {
    expect(hoyISO(new Date("2026-09-24T22:30:00.000Z"))).toBe("2026-09-25");
    expect(hoyISO(new Date("2026-01-01T22:59:00.000Z"))).toBe("2026-01-01");
  });

  it("resuelve los presets relativos", () => {
    expect(leerFecha("p:hoy", AHORA)).toEqual({ desde: "2026-09-24", hasta: "2026-09-24" });
    expect(leerFecha("p:vencido", AHORA)).toEqual({ hasta: "2026-09-24" });
    expect(leerFecha("p:proximos90", AHORA)).toEqual({ desde: "2026-09-24", hasta: "2026-12-23" });
    expect(leerFecha("p:pasados", AHORA)).toEqual({ hasta: "2026-09-23" });
    expect(leerFecha("p:esteMes", AHORA)).toEqual({ desde: "2026-09-01", hasta: "2026-09-30" });
    expect(leerFecha("p:sin", AHORA)).toEqual({ sin: true });
    expect(leerFecha("p:inventado", AHORA)).toBeNull();
  });

  it("lee rangos explícitos e ignora basura", () => {
    expect(leerFecha("2026-01-01~2026-01-31")).toEqual({ desde: "2026-01-01", hasta: "2026-01-31" });
    expect(leerFecha("~2026-01-31")).toEqual({ desde: undefined, hasta: "2026-01-31" });
    expect(leerFecha("ayer~mañana")).toBeNull();
  });

  it("convierte días inclusivos en condición de Prisma", () => {
    expect(condicionFecha({ desde: "2026-09-24", hasta: "2026-09-24" })).toEqual({
      gte: new Date("2026-09-24T00:00:00.000Z"),
      lt: new Date("2026-09-25T00:00:00.000Z"),
    });
    expect(condicionFecha({ sin: true })).toBeNull();
  });
});

describe("valores de la URL", () => {
  it("multi y rango", () => {
    expect(leerMulti("A, B,,C", ["A", "C"])).toEqual(["A", "C"]);
    expect(leerRango("100~")).toEqual({ min: 100, max: undefined });
    expect(leerRango("x~y")).toBeNull();
  });

  it("describe el filtro de asesor con los nombres", () => {
    const campo = FILTROS_INMUEBLES.campos.find((c) => c.clave === "asesor")!;
    const opciones = opcionesFiltroAsesor([
      { id: "u1", nombre: "Marta", activo: true },
      { id: "u2", nombre: "Luis", activo: false },
    ]);
    expect(describirValor(campo, `u1,u2,${SIN_ASESOR}`, opciones)).toBe("Marta, Luis (desactivado), Sin asesor");
  });
});

describe("consultas", () => {
  it("filtra por asesor incluyendo «Sin asesor»", () => {
    const { where } = consultaClientes({ asesor: `u1,${SIN_ASESOR}` });
    expect(where.AND).toContainEqual({ OR: [{ asesorId: { in: ["u1"] } }, { asesorId: null }] });
  });

  it("filtra y ordena por fin de alquiler", () => {
    const { where, orderBy } = consultaInmuebles({ finAlquiler: "p:sin", orden: "finAlquiler" });
    expect(where.AND).toContainEqual({ fechaFinAlquiler: null });
    expect(orderBy).toEqual([{ fechaFinAlquiler: { sort: "asc", nulls: "last" } }]);
  });

  it("nunca filtra por oficina: eso lo hace el cliente con ámbito", () => {
    expect(JSON.stringify(consultaClientes({}).where)).not.toContain("oficinaId");
  });
});
