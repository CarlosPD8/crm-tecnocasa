// Zones against a real Postgres (see tests/global-setup.ts): the triggers that
// keep a flat in its block's zone, and what each advisor sees through the
// scope extension (lib/ambito-oficina.ts + lib/zonas.ts).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { extensionOficina } from "@/lib/ambito-oficina";
import { moverYBorrarZona } from "@/lib/zonas";

const url = process.env.TEST_DATABASE_URL;

const PISO = { direccion: "C/ Z", localidad: "Granada", tipoInmueble: "PISO", tipoOperacion: "VENTA", precio: 1 } as const;

describe.skipIf(!url)("zonas", () => {
  const base = new PrismaClient({ adapter: new PrismaPg({ connectionString: url ?? "" }) });
  const db = (usuarioId: string, zonas: string[] | null = null) =>
    base.$extends(extensionOficina("ofiZ", usuarioId, zonas));

  // D: director. A works Z1, B works Z2, C has no zone yet.
  const dbD = db("zD");
  let dbA: ReturnType<typeof db>;
  let dbB: ReturnType<typeof db>;
  let dbC: ReturnType<typeof db>;
  const id: Record<string, string> = {};

  beforeAll(async () => {
    await base.oficina.create({ data: { id: "ofiZ", nombre: "Zonas" } });
    await base.usuario.createMany({
      data: [
        { id: "zD", oficinaId: "ofiZ", nombre: "Dora", email: "zd@test.local", rol: "DIRECTOR" },
        { id: "zA", oficinaId: "ofiZ", nombre: "Ana", email: "za@test.local" },
        { id: "zB", oficinaId: "ofiZ", nombre: "Bea", email: "zb@test.local" },
        { id: "zC", oficinaId: "ofiZ", nombre: "Ciro", email: "zc@test.local" },
      ],
    });
    id.z1 = (await dbD.zona.create({ data: { nombre: "Z1", color: "azul" } })).id;
    id.z2 = (await dbD.zona.create({ data: { nombre: "Z2", color: "verde" } })).id;
    await dbD.zonaAsesor.createMany({
      data: [
        { zonaId: id.z1, usuarioId: "zA" },
        { zonaId: id.z2, usuarioId: "zB" },
      ],
    });
    dbA = db("zA", [id.z1]);
    dbB = db("zB", [id.z2]);
    dbC = db("zC", []);

    id.b1 = (await dbD.bloque.create({ data: { calle: "Z1", numero: "1", localidad: "Granada", zonaId: id.z1 } })).id;
    id.b2 = (await dbD.bloque.create({ data: { calle: "Z2", numero: "1", localidad: "Granada", zonaId: id.z2 } })).id;

    const cliente = async (nombre: string, asesorId: string | null = null) =>
      (await dbD.cliente.create({ data: { nombre, apellidos: "Z", asesorId } })).id;
    id.c1 = await cliente("Dueño P1");
    id.c2 = await cliente("Dueño P2");
    id.c3 = await cliente("Interesado P2, contactado por P1");
    id.c4 = await cliente("De Ana", "zA");
    id.c5 = await cliente("Suelto");

    // p1 asks for Z2 but lives in b1: the trigger puts it in Z1.
    id.p1 = (await dbD.inmueble.create({ data: { ...PISO, referencia: "Z-P1", bloqueId: id.b1, zonaId: id.z2, propietarioId: id.c1 } })).id;
    id.p2 = (await dbD.inmueble.create({ data: { ...PISO, referencia: "Z-P2", bloqueId: id.b2, zonaId: id.z2, propietarioId: id.c2 } })).id;
    // Z2, but Ana is its advisor.
    id.p3 = (await dbD.inmueble.create({ data: { ...PISO, referencia: "Z-P3", bloqueId: id.b2, zonaId: id.z2, asesorId: "zA" } })).id;
    // Loose flat of Z2.
    id.p4 = (await dbD.inmueble.create({ data: { ...PISO, referencia: "Z-P4", zonaId: id.z2 } })).id;

    await dbD.interes.create({ data: { clienteId: id.c3, inmuebleId: id.p2 } });
    id.k1 = (await dbD.contacto.create({ data: { nota: "k1", clienteId: id.c2, inmuebleId: id.p2 } })).id;
    id.k2 = (await dbD.contacto.create({ data: { nota: "k2", clienteId: id.c5 } })).id;
    id.k3 = (await dbD.contacto.create({ data: { nota: "k3", clienteId: id.c3, inmuebleId: id.p1 } })).id;

    const cita = { tipo: "VISITA", inicio: new Date("2026-10-20T10:00:00Z"), fin: new Date("2026-10-20T11:00:00Z") } as const;
    id.e1 = (await dbD.evento.create({ data: { ...cita, titulo: "e1", inmuebleId: id.p2 } })).id;
    id.e2 = (await dbD.evento.create({ data: { ...cita, titulo: "e2" } })).id;
    // Ana's own appointment with someone she doesn't see.
    id.e3 = (await dbA.evento.create({ data: { ...cita, titulo: "e3", clienteId: id.c5 } })).id;
  });

  afterAll(async () => {
    await base.$disconnect();
  });

  const ids = (filas: { id: string }[]) => filas.map((f) => f.id).sort();
  const de = (...claves: string[]) => claves.map((c) => id[c]).sort();

  it("un piso de un bloque toma la zona del bloque", async () => {
    expect((await base.inmueble.findUniqueOrThrow({ where: { id: id.p1 } })).zonaId).toBe(id.z1);
  });

  it("cada uno ve sus pisos y bloques", async () => {
    expect(ids(await dbA.inmueble.findMany())).toEqual(de("p1", "p3"));
    expect(ids(await dbB.inmueble.findMany())).toEqual(de("p2", "p3", "p4"));
    expect(await dbC.inmueble.findMany()).toEqual([]);
    expect(await dbD.inmueble.count()).toBe(4);

    expect(ids(await dbA.bloque.findMany())).toEqual(de("b1"));
    expect(ids(await dbB.bloque.findMany())).toEqual(de("b2"));
    expect(await dbC.bloque.count()).toBe(0);
  });

  it("cada uno ve sus clientes y los de los pisos que ve", async () => {
    expect(ids(await dbA.cliente.findMany())).toEqual(de("c1", "c3", "c4"));
    expect(ids(await dbB.cliente.findMany())).toEqual(de("c2", "c3"));
    expect(await dbC.cliente.findMany()).toEqual([]);
    expect(await dbD.cliente.count()).toBe(5);
  });

  it("contactos, interesados y citas siguen a lo que ve", async () => {
    expect(ids(await dbA.contacto.findMany())).toEqual(de("k3"));
    expect(ids(await dbB.contacto.findMany())).toEqual(de("k1"));
    expect(await dbA.interes.count()).toBe(0);
    expect(await dbB.interes.count()).toBe(1);
    expect(ids(await dbA.evento.findMany())).toEqual(de("e2", "e3"));
    expect(ids(await dbB.evento.findMany())).toEqual(de("e1", "e2"));
    expect(ids(await dbC.evento.findMany())).toEqual(de("e2"));
  });

  it("lo que no ve no existe: lecturas, cambios y borrados", async () => {
    expect(await dbA.inmueble.findUnique({ where: { id: id.p2 } })).toBeNull();
    expect(await dbA.cliente.findFirst({ where: { id: id.c5 } })).toBeNull();
    await expect(dbA.inmueble.update({ where: { id: id.p2 }, data: { precio: 2 } })).rejects.toMatchObject({ code: "P2025" });
    await expect(dbA.inmueble.delete({ where: { id: id.p4 } })).rejects.toMatchObject({ code: "P2025" });
    expect((await dbA.cliente.updateMany({ data: { notas: "de Ana" } })).count).toBe(3);
    expect((await dbA.contacto.deleteMany({ where: { id: id.k1 } })).count).toBe(0);
    const grupos = await dbA.inmueble.groupBy({ by: ["zonaId"], _count: { _all: true }, orderBy: { zonaId: "asc" } });
    expect(grupos.map((g) => [g.zonaId, g._count._all]).sort()).toEqual([[id.z1, 1], [id.z2, 1]].sort());
  });

  it("los include y los _count solo traen lo que ve", async () => {
    const c3 = await dbA.cliente.findUniqueOrThrow({
      where: { id: id.c3 },
      include: { intereses: true, contactos: true, _count: { select: { intereses: true, contactos: true } } },
    });
    expect(c3.intereses).toEqual([]);
    expect(ids(c3.contactos)).toEqual(de("k3"));
    expect(c3._count).toEqual({ intereses: 0, contactos: 1 });

    // Ana sees p3 (her flat) but not its block, in another zone.
    const p3 = await dbA.inmueble.findUniqueOrThrow({ where: { id: id.p3 }, include: { bloque: true, zona: true } });
    expect(p3.bloque).toBeNull();
    expect(p3.zona.nombre).toBe("Z2");

    const zonas = await dbA.zona.findMany({
      orderBy: { nombre: "asc" },
      select: { nombre: true, _count: { select: { bloques: true, inmuebles: true } } },
    });
    expect(zonas).toEqual([
      { nombre: "Z1", _count: { bloques: 1, inmuebles: 1 } },
      { nombre: "Z2", _count: { bloques: 0, inmuebles: 1 } },
    ]);
    await expect(dbA.bloque.findMany({ include: { _count: true } })).rejects.toThrow(/_count\.select/);
  });

  it("un asesor no gestiona zonas ni cambia la zona de nada", async () => {
    await expect(dbA.zona.create({ data: { nombre: "Mía", color: "rojo" } })).rejects.toThrow(/Solo el director/);
    await expect(dbA.zona.update({ where: { id: id.z1 }, data: { nombre: "x" } })).rejects.toThrow(/Solo el director/);
    await expect(dbA.zonaAsesor.deleteMany({})).rejects.toThrow(/Solo el director/);
    await expect(dbA.bloque.update({ where: { id: id.b1 }, data: { zonaId: id.z2 } })).rejects.toThrow(/Solo el director/);
    await expect(dbA.inmueble.updateMany({ data: { zonaId: id.z1 } })).rejects.toThrow(/Solo el director/);
    await expect(
      dbA.inmueble.create({ data: { ...PISO, referencia: "Z-X", zonaId: id.z2 } })
    ).rejects.toThrow(/tus zonas/);
    await expect(
      dbA.cliente.upsert({ where: { id: id.c5 }, update: {}, create: { nombre: "x", apellidos: "x" } })
    ).rejects.toThrow(/upsert/);
    // In their zone, fine: lands in Z1 with Ana as author.
    const nuevo = await dbA.inmueble.create({ data: { ...PISO, referencia: "Z-P5", zonaId: id.z1 } });
    expect(nuevo).toMatchObject({ zonaId: id.z1, creadoPorId: "zA" });
    await dbD.inmueble.delete({ where: { id: nuevo.id } });
  });
});

describe.skipIf(!url)("zonas: triggers y borrado", () => {
  const base = new PrismaClient({ adapter: new PrismaPg({ connectionString: url ?? "" }) });
  const dbT = base.$extends(extensionOficina("ofiT", "tD"));
  const id: Record<string, string> = {};

  beforeAll(async () => {
    await base.oficina.create({ data: { id: "ofiT", nombre: "Triggers" } });
    await base.usuario.createMany({
      data: [
        { id: "tD", oficinaId: "ofiT", nombre: "Dora", email: "td@test.local", rol: "DIRECTOR" },
        { id: "tA", oficinaId: "ofiT", nombre: "Ana", email: "ta@test.local" },
      ],
    });
    id.t1 = (await dbT.zona.create({ data: { nombre: "T1", color: "azul" } })).id;
    id.t2 = (await dbT.zona.create({ data: { nombre: "T2", color: "verde" } })).id;
    await dbT.zonaAsesor.create({ data: { zonaId: id.t1, usuarioId: "tA" } });
    id.b = (await dbT.bloque.create({ data: { calle: "T", numero: "1", localidad: "Granada", zonaId: id.t1 } })).id;
    id.p1 = (await dbT.inmueble.create({ data: { ...PISO, referencia: "T-1", bloqueId: id.b, zonaId: id.t1 } })).id;
    id.p2 = (await dbT.inmueble.create({ data: { ...PISO, referencia: "T-2", bloqueId: id.b, zonaId: id.t1 } })).id;
    id.p3 = (await dbT.inmueble.create({ data: { ...PISO, referencia: "T-3", zonaId: id.t2 } })).id;
  });

  afterAll(async () => {
    await base.$disconnect();
  });

  const zona = async (pisoId: string) => (await base.inmueble.findUniqueOrThrow({ where: { id: pisoId } })).zonaId;

  it("entrar en un bloque cambia la zona del piso; salir la conserva", async () => {
    await dbT.inmueble.update({ where: { id: id.p3 }, data: { bloqueId: id.b } });
    expect(await zona(id.p3)).toBe(id.t1);
    await dbT.inmueble.update({ where: { id: id.p3 }, data: { bloqueId: null } });
    expect(await zona(id.p3)).toBe(id.t1);
    // Loose, it can change zone; in a block, the block's zone wins.
    await dbT.inmueble.update({ where: { id: id.p3 }, data: { zonaId: id.t2 } });
    expect(await zona(id.p3)).toBe(id.t2);
    await dbT.inmueble.update({ where: { id: id.p1 }, data: { zonaId: id.t2 } });
    expect(await zona(id.p1)).toBe(id.t1);
  });

  it("cambiar la zona de un bloque se la cambia a sus pisos", async () => {
    await dbT.bloque.update({ where: { id: id.b }, data: { zonaId: id.t2 } });
    expect([await zona(id.p1), await zona(id.p2)]).toEqual([id.t2, id.t2]);
    await dbT.bloque.update({ where: { id: id.b }, data: { zonaId: id.t1 } });
    expect([await zona(id.p1), await zona(id.p2)]).toEqual([id.t1, id.t1]);
  });

  it("una zona con bloques o pisos no se borra sin moverlos", async () => {
    await expect(dbT.zona.delete({ where: { id: id.t1 } })).rejects.toThrow();
    await expect(dbT.$transaction((tx) => moverYBorrarZona(tx, id.t1, null))).rejects.toThrow(/Falta la zona/);
    // An empty one needs no destination.
    const vacia = await dbT.zona.create({ data: { nombre: "Vacía", color: "gris" } });
    expect(await dbT.$transaction((tx) => moverYBorrarZona(tx, vacia.id, null))).toEqual({ bloques: 0, pisos: 0 });
  });

  it("borrar una zona mueve sus bloques y pisos a otra y quita sus asesores", async () => {
    await dbT.inmueble.update({ where: { id: id.p3 }, data: { zonaId: id.t1 } });
    const movidos = await dbT.$transaction((tx) => moverYBorrarZona(tx, id.t1, id.t2));
    expect(movidos).toEqual({ bloques: 1, pisos: 3 });
    expect((await base.bloque.findUniqueOrThrow({ where: { id: id.b } })).zonaId).toBe(id.t2);
    expect([await zona(id.p1), await zona(id.p2), await zona(id.p3)]).toEqual([id.t2, id.t2, id.t2]);
    expect(await dbT.zona.count()).toBe(1);
    expect(await dbT.zonaAsesor.count()).toBe(0);
  });
});
