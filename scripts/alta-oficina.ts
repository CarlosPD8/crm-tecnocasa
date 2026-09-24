// Da de alta una oficina con su director, o añade un director a una oficina que
// ya existe. Es la única forma de crear oficinas: la app no la ofrece.
//
//   npx tsx scripts/alta-oficina.ts --oficina "Tecnocasa Zaidín" --nombre "Ana López" --email ana@ejemplo.com
//   npx tsx scripts/alta-oficina.ts --oficina-id <id> --nombre "Luis Gil" --email luis@ejemplo.com
//   npx tsx scripts/alta-oficina.ts --listar
//
// Imprime una sola vez la contraseña temporal del director; al entrar, el CRM
// le obliga a cambiarla.

import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { generarPasswordTemporal } from "../lib/password-temporal";

const { values: args } = parseArgs({
  options: {
    oficina: { type: "string" },
    "oficina-id": { type: "string" },
    nombre: { type: "string" },
    email: { type: "string" },
    listar: { type: "boolean", default: false },
    si: { type: "boolean", default: false },
  },
});

function salir(mensaje: string): never {
  console.error(mensaje);
  process.exit(1);
}

const host = (() => {
  try {
    return new URL(process.env.DIRECT_URL ?? "").host;
  } catch {
    return salir("DIRECT_URL no está definida o no es válida (.env.local).");
  }
})();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL! }),
});

async function listar() {
  const oficinas = await prisma.oficina.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      usuarios: { select: { nombre: true, email: true, rol: true, activo: true }, orderBy: { createdAt: "asc" } },
      _count: { select: { clientes: true, inmuebles: true } },
    },
  });
  for (const o of oficinas) {
    console.log(`\n${o.nombre}  (id ${o.id}${o.activa ? "" : ", INACTIVA"}) · ${o._count.clientes} clientes · ${o._count.inmuebles} inmuebles`);
    for (const u of o.usuarios) {
      console.log(`  ${u.rol === "DIRECTOR" ? "Director" : "Asesor  "}  ${u.nombre} <${u.email}>${u.activo ? "" : " (inactivo)"}`);
    }
  }
}

async function alta() {
  const nombre = args.nombre?.trim();
  const email = args.email?.trim().toLowerCase();
  if (!nombre || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    salir("Faltan --nombre y un --email válido del director.");
  }
  if (Boolean(args.oficina) === Boolean(args["oficina-id"])) {
    salir("Indica --oficina \"Nombre\" para crear una oficina o --oficina-id <id> para una existente.");
  }

  const existente = args["oficina-id"]
    ? await prisma.oficina.findUnique({ where: { id: args["oficina-id"] } })
    : null;
  if (args["oficina-id"] && !existente) salir(`No existe ninguna oficina con id ${args["oficina-id"]}.`);
  if (await prisma.usuario.findUnique({ where: { email } })) salir(`${email} ya tiene cuenta en el CRM.`);

  const oficinaNombre = existente?.nombre ?? args.oficina!.trim();
  console.log(`\nBase de datos: ${host}`);
  console.log(existente ? `Oficina existente: ${oficinaNombre} (${existente.id})` : `Oficina NUEVA: ${oficinaNombre}`);
  console.log(`Director: ${nombre} <${email}>`);

  if (!args.si) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const respuesta = await rl.question("\n¿Crear? Escribe «si» para continuar: ");
    rl.close();
    if (respuesta.trim().toLowerCase() !== "si") salir("Cancelado.");
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const password = generarPasswordTemporal();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (error || !data.user) salir(`Supabase Auth no creó el usuario: ${error?.message ?? "sin respuesta"}`);

  try {
    const oficina = await prisma.$transaction(async (tx) => {
      const o = existente ?? (await tx.oficina.create({ data: { nombre: oficinaNombre } }));
      await tx.usuario.create({
        data: { id: data.user.id, oficinaId: o.id, nombre, email, rol: "DIRECTOR", debeCambiarPassword: true },
      });
      return o;
    });
    console.log(`\nListo. Oficina ${oficina.nombre} (id ${oficina.id}).`);
    console.log(`Contraseña temporal de ${email}:  ${password}`);
    console.log("Se muestra solo esta vez. Al entrar, el CRM le pedirá cambiarla.");
  } catch (e) {
    // Don't leave an Auth user without a profile.
    await admin.auth.admin.deleteUser(data.user.id);
    throw e;
  }
}

(args.listar ? listar() : alta())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
