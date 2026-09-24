// Office isolation against a real Postgres (see tests/global-setup.ts): the
// Prisma extension (lib/ambito-oficina.ts) and the database triggers.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { extensionOficina } from "@/lib/ambito-oficina";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("aislamiento entre oficinas", () => {
  const base = new PrismaClient({ adapter: new PrismaPg({ connectionString: url ?? "" }) });
  const dbA = base.$extends(extensionOficina("ofiA", "userA"));
  const dbB = base.$extends(extensionOficina("ofiB", "userB"));
  const ids = { clienteA: "", clienteB: "", inmuebleA: "", bloqueB: "" };

  beforeAll(async () => {
    await base.oficina.createMany({
      data: [
        { id: "ofiA", nombre: "A" },
        { id: "ofiB", nombre: "B" },
      ],
    });
    await base.usuario.createMany({
      data: [
        { id: "userA", oficinaId: "ofiA", nombre: "Ana", email: "a@test.local", rol: "DIRECTOR" },
        { id: "userB", oficinaId: "ofiB", nombre: "Beto", email: "b@test.local", rol: "DIRECTOR" },
      ],
    });
    ids.clienteA = (await dbA.cliente.create({ data: { nombre: "Cli", apellidos: "A", dni: "12345678Z" } })).id;
    ids.clienteB = (await dbB.cliente.create({ data: { nombre: "Cli", apellidos: "B", dni: "12345678Z" } })).id;
    ids.inmuebleA = (
      await dbA.inmueble.create({
        data: {
          referencia: "REF-1",
          direccion: "C/ A",
          localidad: "Granada",
          tipoInmueble: "PISO",
          tipoOperacion: "VENTA",
          precio: 100,
          propietarioId: ids.clienteA,
        },
      })
    ).id;
    ids.bloqueB = (await dbB.bloque.create({ data: { calle: "C/ B", numero: "1", localidad: "Granada" } })).id;
    await dbB.inmueble.create({
      data: { referencia: "REF-1", direccion: "C/ B", localidad: "Granada", tipoInmueble: "PISO", tipoOperacion: "VENTA", precio: 1 },
    });
  });

  afterAll(async () => {
    await base.$disconnect();
  });

  it("crea con la oficina y el autor del contexto", async () => {
    const c = await base.cliente.findUniqueOrThrow({ where: { id: ids.clienteA } });
    expect(c.oficinaId).toBe("ofiA");
    expect(c.creadoPorId).toBe("userA");
  });

  it("permite el mismo DNI y la misma referencia en oficinas distintas", async () => {
    expect(await base.cliente.count({ where: { dni: "12345678Z" } })).toBe(2);
    expect(await base.inmueble.count({ where: { referencia: "REF-1" } })).toBe(2);
  });

  it("no ve nada de otra oficina en ninguna lectura", async () => {
    expect(await dbB.cliente.findUnique({ where: { id: ids.clienteA } })).toBeNull();
    expect(await dbB.cliente.findFirst({ where: { id: ids.clienteA } })).toBeNull();
    expect(await dbB.cliente.findMany({ where: { id: ids.clienteA } })).toEqual([]);
    expect(await dbB.cliente.count({ where: { id: ids.clienteA } })).toBe(0);
    expect(await dbA.cliente.count()).toBe(1);
    const grupos = await dbA.inmueble.groupBy({ by: ["referencia"], _count: { _all: true } });
    expect(grupos).toEqual([{ referencia: "REF-1", _count: { _all: 1 } }]);
    const agregado = await dbA.inmueble.aggregate({ _sum: { precio: true } });
    expect(Number(agregado._sum.precio)).toBe(100);
    expect(await dbA.oficina.findUnique({ where: { id: "ofiB" } })).toBeNull();
    expect((await dbA.oficina.findFirst())?.id).toBe("ofiA");
    expect((await dbA.usuario.findMany()).map((u) => u.id)).toEqual(["userA"]);
  });

  it("no modifica ni borra filas de otra oficina", async () => {
    await expect(dbB.cliente.update({ where: { id: ids.clienteA }, data: { notas: "x" } })).rejects.toMatchObject({
      code: "P2025",
    });
    await expect(dbB.cliente.delete({ where: { id: ids.clienteA } })).rejects.toMatchObject({ code: "P2025" });
    expect((await dbB.cliente.updateMany({ data: { notas: "de B" } })).count).toBe(1);
    expect((await dbB.contacto.deleteMany({})).count).toBe(0);
    expect((await base.cliente.findUniqueOrThrow({ where: { id: ids.clienteA } })).notas).toBeNull();
    await expect(
      dbB.cliente.upsert({ where: { id: ids.clienteA }, update: { notas: "x" }, create: { nombre: "N", apellidos: "N" } })
    ).resolves.toMatchObject({ oficinaId: "ofiB" });
    expect((await base.cliente.findUniqueOrThrow({ where: { id: ids.clienteA } })).notas).toBeNull();
  });

  it("los triggers impiden enlazar filas de otra oficina", async () => {
    await expect(
      dbA.contacto.create({ data: { nota: "x", clienteId: ids.clienteB } })
    ).rejects.toThrow(/otra oficina/);
    await expect(
      dbA.inmueble.update({ where: { id: ids.inmuebleA }, data: { bloqueId: ids.bloqueB } })
    ).rejects.toThrow(/otra oficina/);
    await expect(
      dbA.cliente.update({ where: { id: ids.clienteA }, data: { asesorId: "userB" } })
    ).rejects.toThrow(/otra oficina/);
    // Also with the unscoped client: the database is the last line.
    await expect(
      base.interes.create({ data: { oficinaId: "ofiA", clienteId: ids.clienteA, inmuebleId: ids.inmuebleA.replace(/./, "x") } })
    ).rejects.toThrow();
    await expect(
      base.interes.create({ data: { oficinaId: "ofiB", clienteId: ids.clienteB, inmuebleId: ids.inmuebleA } })
    ).rejects.toThrow(/otra oficina/);
  });

  it("oficinaId es inmutable y obligatorio", async () => {
    await expect(
      base.cliente.update({ where: { id: ids.clienteA }, data: { oficinaId: "ofiB" } })
    ).rejects.toThrow(/No se puede cambiar la oficina/);
    await expect(
      base.cliente.create({ data: { nombre: "Sin", apellidos: "Oficina" } })
    ).rejects.toThrow(/Falta oficinaId/);
    await expect(
      base.usuario.create({ data: { id: "x", nombre: "x", email: "x@test.local" } })
    ).rejects.toThrow(/Falta oficinaId/);
  });

  it("la extensión rechaza SQL crudo, escrituras anidadas y cambios de oficina o autor", async () => {
    await expect(dbA.$queryRaw`select 1`).rejects.toThrow(/no está permitido/);
    await expect(dbA.$executeRawUnsafe("select 1")).rejects.toThrow(/no está permitido/);
    await expect(
      dbA.contacto.create({ data: { nota: "x", cliente: { connect: { id: ids.clienteB } } } })
    ).rejects.toThrow(/Escritura anidada/);
    await expect(
      dbA.cliente.update({ where: { id: ids.clienteA }, data: { contactos: { create: { nota: "x" } } } })
    ).rejects.toThrow(/Escritura anidada/);
    await expect(dbA.cliente.updateMany({ data: { oficinaId: "ofiB" } })).rejects.toThrow(/no se puede modificar/);
    await expect(dbA.cliente.updateMany({ data: { creadoPorId: "userB" } })).rejects.toThrow(/no se puede modificar/);
    await expect(dbA.oficina.update({ where: { id: "ofiA" }, data: { nombre: "x" } })).rejects.toThrow(/no está permitido/);
  });

  it("las transacciones conservan el ámbito", async () => {
    // B has its client plus the one the upsert above created.
    const [a, b] = await dbA.$transaction([dbA.cliente.count(), dbB.cliente.count()]);
    expect([a, b]).toEqual([1, 2]);
    const dentro = await dbA.$transaction(async (tx) => {
      const visibles = await tx.cliente.findMany({ select: { id: true } });
      const creado = await tx.contacto.create({ data: { nota: "en tx", clienteId: ids.clienteA } });
      return { visibles, creado };
    });
    expect(dentro.visibles.map((c) => c.id)).toEqual([ids.clienteA]);
    expect(dentro.creado).toMatchObject({ oficinaId: "ofiA", creadoPorId: "userA" });
  });

  it("los include y los _count solo alcanzan filas de la oficina", async () => {
    const inm = await dbA.inmueble.findUniqueOrThrow({
      where: { id: ids.inmuebleA },
      include: { propietario: true, _count: { select: { contactos: true } } },
    });
    expect(inm.propietario?.oficinaId).toBe("ofiA");
    const clientesB = await dbB.cliente.findMany({ include: { contactos: true, inmueblesEnPropiedad: true } });
    expect(clientesB.flatMap((c) => [...c.contactos, ...c.inmueblesEnPropiedad]).every((r) => r.oficinaId === "ofiB")).toBe(true);
  });
});
