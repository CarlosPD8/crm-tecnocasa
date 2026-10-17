// Location control against a real Postgres (see tests/global-setup.ts): the
// read-only client an advisor gets until the action checks where they are, the
// place stamped on the activity log, and the office settings only a director
// changes (lib/ambito-oficina.ts).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { extensionOficina, type OpcionesDb } from "@/lib/ambito-oficina";

const url = process.env.TEST_DATABASE_URL;

const ACTIVIDAD = { accion: "ALTA", resumen: "x", dia: new Date("2026-10-16T00:00:00Z") } as const;

describe.skipIf(!url)("control de ubicación", () => {
  const base = new PrismaClient({ adapter: new PrismaPg({ connectionString: url ?? "" }) });
  const db = (usuarioId: string, zonas: string[] | null, opciones: OpcionesDb = {}) =>
    base.$extends(extensionOficina("ofiU", usuarioId, zonas, opciones));

  const dbD = db("uD", null);
  let zona = "";
  let cliente = "";
  let dbLectura: ReturnType<typeof db>;
  let dbEnZona: ReturnType<typeof db>;

  beforeAll(async () => {
    await base.oficina.createMany({
      data: [
        { id: "ofiU", nombre: "Ubicación" },
        { id: "ofiU2", nombre: "Otra" },
      ],
    });
    await base.usuario.createMany({
      data: [
        { id: "uD", oficinaId: "ofiU", nombre: "Dora", email: "ud@test.local", rol: "DIRECTOR" },
        { id: "uA", oficinaId: "ofiU", nombre: "Ana", email: "ua@test.local" },
      ],
    });
    zona = (await dbD.zona.create({ data: { nombre: "Zaidín", color: "verde" } })).id;
    await dbD.zonaAsesor.create({ data: { zonaId: zona, usuarioId: "uA" } });
    cliente = (await dbD.cliente.create({ data: { nombre: "Clara", apellidos: "U", asesorId: "uA" } })).id;
    dbLectura = db("uA", [zona], { soloLectura: "sin ubicación" });
    dbEnZona = db("uA", [zona], { lugar: "Zaidín" });
  });

  afterAll(async () => {
    await base.$disconnect();
  });

  it("sin la ubicación comprobada, el asesor solo lee", async () => {
    expect(await dbLectura.cliente.count()).toBe(1);
    expect((await dbLectura.cliente.findUnique({ where: { id: cliente } }))?.nombre).toBe("Clara");

    const intentos = [
      () => dbLectura.cliente.create({ data: { nombre: "Nuevo", apellidos: "U" } }),
      () => dbLectura.cliente.update({ where: { id: cliente }, data: { notas: "x" } }),
      () => dbLectura.cliente.updateMany({ data: { notas: "x" } }),
      () => dbLectura.cliente.delete({ where: { id: cliente } }),
      () => dbLectura.cliente.deleteMany({}),
      () => dbLectura.contacto.createMany({ data: [{ nota: "x", clienteId: cliente }] }),
      () => dbLectura.actividad.create({ data: ACTIVIDAD }),
      () => dbLectura.usuario.updateMany({ where: { id: "uA" }, data: { nombre: "Otra" } }),
      () => dbLectura.oficina.update({ where: { id: "ofiU" }, data: { radioMetros: 200 } }),
    ];
    for (const intento of intentos) await expect(intento()).rejects.toThrow(/sin ubicación/);
  });

  it("tampoco dentro de una transacción", async () => {
    await expect(
      dbLectura.$transaction(async (tx) => {
        await tx.contacto.create({ data: { nota: "x", clienteId: cliente } });
      })
    ).rejects.toThrow(/sin ubicación/);
    await expect(
      dbLectura.$transaction([dbLectura.contacto.create({ data: { nota: "x", clienteId: cliente } })])
    ).rejects.toThrow(/sin ubicación/);
    expect(await base.contacto.count({ where: { clienteId: cliente } })).toBe(0);
  });

  it("con la ubicación comprobada guarda, y el registro lleva el lugar", async () => {
    const linea = await dbEnZona.$transaction(async (tx) => {
      await tx.contacto.create({ data: { nota: "desde la calle", clienteId: cliente } });
      return tx.actividad.create({ data: { ...ACTIVIDAD, lugar: "Inventado" } });
    });
    expect(linea).toMatchObject({ lugar: "Zaidín", creadoPorId: "uA", oficinaId: "ofiU" });
    expect(await base.contacto.count({ where: { clienteId: cliente } })).toBe(1);
  });

  it("sin control (el director) no cambia nada", async () => {
    const linea = await dbD.actividad.create({ data: ACTIVIDAD });
    expect(linea.lugar).toBeNull();
    await expect(dbD.cliente.update({ where: { id: cliente }, data: { notas: "ok" } })).resolves.toBeTruthy();
  });

  it("el director cambia los ajustes de ubicación de su oficina, y nada más", async () => {
    await dbD.oficina.update({
      where: { id: "ofiU" },
      data: { latitud: 37.17, longitud: -3.6, radioMetros: 200, redes: ["81.32.10.4"] },
    });
    // Asking for another office still changes its own row.
    await dbD.oficina.update({ where: { id: "ofiU2" }, data: { radioMetros: 300 } });
    expect(await base.oficina.findUniqueOrThrow({ where: { id: "ofiU" } })).toMatchObject({
      latitud: 37.17,
      radioMetros: 300,
      redes: ["81.32.10.4"],
    });
    expect((await base.oficina.findUniqueOrThrow({ where: { id: "ofiU2" } })).radioMetros).toBe(150);

    await expect(dbD.oficina.update({ where: { id: "ofiU" }, data: { nombre: "Otra" } })).rejects.toThrow(
      /Oficina.nombre/
    );
    await expect(dbD.oficina.update({ where: { id: "ofiU" }, data: { activa: false } })).rejects.toThrow();
    await expect(dbD.oficina.updateMany({ data: { radioMetros: 100 } })).rejects.toThrow();
    // An advisor (zone scope) can't touch them.
    await expect(dbEnZona.oficina.update({ where: { id: "ofiU" }, data: { radioMetros: 100 } })).rejects.toThrow();
  });

  it("la base de datos no deja activar el control sin la oficina en el mapa", async () => {
    await expect(base.oficina.update({ where: { id: "ofiU2" }, data: { controlUbicacion: true } })).rejects.toThrow(
      /Oficina_control_con_punto/
    );
    await expect(base.oficina.update({ where: { id: "ofiU2" }, data: { radioMetros: 20 } })).rejects.toThrow(
      /Oficina_radio_valido/
    );
    await expect(base.oficina.update({ where: { id: "ofiU2" }, data: { latitud: 37 } })).rejects.toThrow(
      /Oficina_punto_completo/
    );
    await expect(
      base.oficina.update({ where: { id: "ofiU2" }, data: { redes: ["1", "2", "3", "4", "5", "6"] } })
    ).rejects.toThrow(/Oficina_redes_max/);
    await expect(
      dbD.oficina.update({ where: { id: "ofiU" }, data: { controlUbicacion: true, controlUbicacionDesde: new Date() } })
    ).resolves.toMatchObject({ controlUbicacion: true });
  });

  it("el contorno de una zona se guarda como objeto", async () => {
    const forma = { type: "Polygon", coordinates: [[[-3.6, 37.17], [-3.59, 37.17], [-3.59, 37.18], [-3.6, 37.17]]] };
    await dbD.zona.update({ where: { id: zona }, data: { forma } });
    expect((await base.zona.findUniqueOrThrow({ where: { id: zona } })).forma).toEqual(forma);
    await expect(base.zona.update({ where: { id: zona }, data: { forma: [1, 2] } })).rejects.toThrow(/Zona_forma_objeto/);
  });
});
