// Structural checks: every server action checks the session and office (and,
// if it saves, the location), and only the allowed files touch the unscoped
// Prisma client or the service role.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = path.join(dir, nombre);
    if (statSync(ruta).isDirectory()) return nombre === "generated" ? [] : archivos(ruta);
    return /\.tsx?$/.test(nombre) ? [ruta] : [];
  });
}

const CODIGO = ["app", "components", "lib"].flatMap(archivos).map((f) => f.split(path.sep).join("/"));

// Actions that only read: they may skip the location check.
const LECTURAS = new Set(["buscarClientes", "buscarBloques", "buscarInmuebles", "obtenerCalendario", "consultarLugar"]);

describe("acciones de servidor", () => {
  const acciones = CODIGO.filter((f) => f.startsWith("lib/actions/"));

  // Every other action saves data, so it checks the location first
  // (getContextoEscritura) unless it's director-only (contextoDirector): a new
  // action fails here until it's classified.
  it.each(acciones)("%s: cada acción exportada comprueba la sesión y, si guarda, la ubicación", (archivo) => {
    const fuente = readFileSync(archivo, "utf8");
    expect(fuente.startsWith('"use server"')).toBe(true);
    const otros = [...fuente.matchAll(/^export (?!async function |type |interface )/gm)];
    expect(otros.length, `${archivo}: solo se exportan funciones async`).toBe(0);
    const funciones = [...fuente.matchAll(/export async function (\w+)\(([^)]*)\)[^{]*\{([\s\S]*?)\n\}/g)];
    expect(funciones.length).toBeGreaterThan(0);
    for (const [, nombre, parametros, cuerpo] of funciones) {
      const inicio = cuerpo.split("\n").slice(0, 4).join("\n");
      const comprueba = LECTURAS.has(nombre)
        ? /getContexto\(/
        : archivo.endsWith("/cuenta.ts")
          ? /getContexto\(|getSesionPerfil\(/
          : /getContextoEscritura\(ub\)|contextoDirector\(/;
      expect(comprueba.test(inicio), `${archivo}: ${nombre} no empieza por ${comprueba.source}`).toBe(true);
      if (/getContextoEscritura\(/.test(inicio)) {
        expect(parametros.trim(), `${archivo}: ${nombre} debe acabar en ub: UbicacionEnviada`).toMatch(
          /ub: UbicacionEnviada,?$/
        );
      }
    }
  });
});

describe("importaciones restringidas", () => {
  it("solo lib/db.ts usa el cliente Prisma sin ámbito", () => {
    const usan = CODIGO.filter((f) => /from "@\/lib\/prisma"/.test(readFileSync(f, "utf8")));
    expect(usan).toEqual(["lib/db.ts"]);
  });

  it("solo lib/db.ts y cuenta crean clientes de oficina (así el que escribe pasa por la ubicación)", () => {
    const usan = CODIGO.filter((f) => /crearDbOficina\(/.test(readFileSync(f, "utf8"))).sort();
    expect(usan).toEqual(["lib/actions/cuenta.ts", "lib/db.ts"]);
  });

  it("solo storage, cuenta y equipo usan el cliente service-role", () => {
    const usan = CODIGO.filter((f) => /from "@\/lib\/supabase\/admin"/.test(readFileSync(f, "utf8"))).sort();
    expect(usan).toEqual(["lib/actions/cuenta.ts", "lib/actions/equipo.ts", "lib/supabase/storage.ts"]);
  });

  it("la clave service-role nunca se expone al navegador", () => {
    const fugas = CODIGO.filter((f) => /NEXT_PUBLIC_SUPABASE_SERVICE|NEXT_PUBLIC_.*SERVICE_ROLE/.test(readFileSync(f, "utf8")));
    expect(fugas).toEqual([]);
  });
});
