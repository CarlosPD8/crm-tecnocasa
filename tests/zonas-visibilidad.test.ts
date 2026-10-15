// Zone visibility without a database: the where fragments, conAnd and the walk
// over include/select (lib/zonas.ts), and the relation map they rely on.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RELACIONES } from "@/lib/esquema";
import { acotarRelaciones, conAnd, visibilidad } from "@/lib/zonas";
import { busquedaExacta } from "@/lib/validations/cliente";
import { consultaBloques, consultaInmuebles } from "@/lib/filtros/consultas";

const VIS = visibilidad({ usuarioId: "u1", zonas: ["z1", "z2"] });
const PISO_VISIBLE = { OR: [{ zonaId: { in: ["z1", "z2"] } }, { asesorId: "u1" }] };

describe("mapa de relaciones", () => {
  it("coincide con prisma/schema.prisma (modelo destino, lista u opcional)", () => {
    const esquema = readFileSync("prisma/schema.prisma", "utf8");
    const modelos = [...esquema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)];
    const nombres = new Set(modelos.map((m) => m[1]));
    const leido: Record<string, Record<string, string>> = {};
    for (const [, modelo, cuerpo] of modelos) {
      leido[modelo] = {};
      for (const linea of cuerpo.split("\n")) {
        const campo = linea.match(/^\s+(\w+)\s+(\w+)(\[\]|\?)?/);
        if (campo && nombres.has(campo[2])) leido[modelo][campo[1]] = campo[2] + (campo[3] ?? "");
      }
    }
    expect(RELACIONES).toEqual(leido);
  });
});

describe("visibilidad de un asesor", () => {
  it("pisos de sus zonas o de los que es asesor; bloques de sus zonas", () => {
    expect(VIS.Inmueble).toEqual(PISO_VISIBLE);
    expect(VIS.Bloque).toEqual({ zonaId: { in: ["z1", "z2"] } });
  });

  it("clientes suyos o enlazados a un piso que ve", () => {
    expect(VIS.Cliente).toEqual({
      OR: [
        { asesorId: "u1" },
        { inmueblesEnPropiedad: { some: PISO_VISIBLE } },
        { intereses: { some: { inmueble: PISO_VISIBLE } } },
        { operaciones: { some: { inmueble: PISO_VISIBLE } } },
        { contactos: { some: { inmueble: PISO_VISIBLE } } },
      ],
    });
  });

  it("contactos y archivos cuelgan del piso si lo tienen, si no del cliente", () => {
    expect(VIS.Contacto).toEqual({ OR: [{ inmueble: PISO_VISIBLE }, { inmuebleId: null, cliente: VIS.Cliente }] });
    expect(VIS.Archivo).toEqual(VIS.Contacto);
    expect(VIS.Interes).toEqual({ inmueble: PISO_VISIBLE });
    expect(VIS.Operacion).toEqual({ inmueble: PISO_VISIBLE });
  });

  it("citas suyas, o sin enlaces a algo que no ve", () => {
    expect(VIS.Evento).toEqual({
      OR: [
        { creadoPorId: "u1" },
        {
          AND: [
            { OR: [{ inmuebleId: null }, { inmueble: PISO_VISIBLE }] },
            { OR: [{ clienteId: null }, { cliente: VIS.Cliente }] },
          ],
        },
      ],
    });
  });

  it("sin zonas no ve pisos ni bloques, solo sus clientes", () => {
    const sin = visibilidad({ usuarioId: "u1", zonas: [] });
    expect(sin.Inmueble).toEqual({ id: { in: [] } });
    expect(sin.Bloque).toEqual({ id: { in: [] } });
    expect(sin.Cliente).toEqual({ asesorId: "u1" });
  });
});

describe("conAnd", () => {
  it("deja las claves únicas arriba y conserva el AND que hubiera", () => {
    expect(conAnd({ id: "x" }, { a: 1 })).toEqual({ id: "x", AND: [{ a: 1 }] });
    expect(conAnd(undefined, { a: 1 })).toEqual({ AND: [{ a: 1 }] });
    expect(conAnd({ AND: { b: 2 } }, { a: 1 })).toEqual({ AND: [{ b: 2 }, { a: 1 }] });
    expect(conAnd({ id: "x", AND: [{ b: 2 }] }, { a: 1 })).toEqual({ id: "x", AND: [{ b: 2 }, { a: 1 }] });
  });
});

describe("cliente de otra zona por DNI o teléfono exactos", () => {
  it("un DNI válido, con o sin puntos y guiones", () => {
    expect(busquedaExacta("12.345.678-z")).toEqual({ dni: "12345678Z" });
    expect(busquedaExacta("12345678A")).toBeNull();
  });

  it("un teléfono de 9 cifras, escrito como se suele escribir", () => {
    const formas = ["612345678", "612 345 678", "612 34 56 78", "612-345-678"].map((f) => ({ telefono: { endsWith: f } }));
    expect(busquedaExacta("612 345 678")).toEqual({ OR: formas });
    expect(busquedaExacta("+34 612345678")).toEqual({ OR: formas });
  });

  it("un nombre o un trozo de número no", () => {
    expect(busquedaExacta("Lucía")).toBeNull();
    expect(busquedaExacta("612 345")).toBeNull();
  });
});

describe("filtro de zona", () => {
  it("inmuebles y bloques de las zonas elegidas", () => {
    expect(consultaInmuebles({ zona: "z1,z2" }).where.AND).toContainEqual({ zonaId: { in: ["z1", "z2"] } });
    expect(consultaBloques({ zona: "z1" }).where.AND).toContainEqual({ zonaId: { in: ["z1"] } });
  });
});

describe("acotarRelaciones", () => {
  it("filtra listas y opcionales hacia modelos con zona, también anidadas", () => {
    const include = {
      propietario: { select: { nombre: true } },
      bloque: true,
      asesor: true,
      contactos: { where: { nota: "x" }, include: { cliente: true } },
      intereses: { include: { cliente: true, inmueble: true } },
    };
    expect(acotarRelaciones("Inmueble", include, VIS)).toEqual({
      propietario: { select: { nombre: true }, where: { AND: [VIS.Cliente] } },
      bloque: { where: { AND: [VIS.Bloque] } },
      asesor: true,
      contactos: {
        where: { nota: "x", AND: [VIS.Contacto] },
        include: { cliente: { where: { AND: [VIS.Cliente] } } },
      },
      // Required relations of a visible interest are visible: no filter there.
      intereses: { include: { cliente: true, inmueble: true }, where: { AND: [VIS.Interes] } },
    });
  });

  it("pasa por modelos sin zona hasta sus relaciones con zona", () => {
    expect(acotarRelaciones("Zona", { asesores: { include: { usuario: { select: { inmueblesAsignados: true } } } } }, VIS))
      .toEqual({
        asesores: { include: { usuario: { select: { inmueblesAsignados: { where: { AND: [VIS.Inmueble] } } } } } },
      });
  });

  it("filtra los _count.select y no toca los escalares", () => {
    expect(
      acotarRelaciones("Bloque", { id: true, calle: true, _count: { select: { inmuebles: true } } }, VIS)
    ).toEqual({ id: true, calle: true, _count: { select: { inmuebles: { where: { AND: [VIS.Inmueble] } } } } });
  });

  it("rechaza _count: true si contaría filas con zona", () => {
    expect(() => acotarRelaciones("Bloque", { _count: true }, VIS)).toThrow(/_count\.select/);
    expect(acotarRelaciones("Actividad", { _count: true }, VIS)).toEqual({ _count: true });
  });
});
