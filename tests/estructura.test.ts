// Structural checks: every server action checks the session and office, and
// only the allowed files touch the unscoped Prisma client or the service role.

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

describe("acciones de servidor", () => {
  const acciones = CODIGO.filter((f) => f.startsWith("lib/actions/"));

  it.each(acciones)("%s: cada acción exportada comprueba la sesión", (archivo) => {
    const fuente = readFileSync(archivo, "utf8");
    expect(fuente.startsWith('"use server"')).toBe(true);
    const funciones = [...fuente.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{([\s\S]*?)\n\}/g)];
    expect(funciones.length).toBeGreaterThan(0);
    for (const [, nombre, cuerpo] of funciones) {
      const comprueba = /getContexto\(|contextoDirector\(|getSesionPerfil\(/.test(cuerpo.split("\n").slice(0, 4).join("\n"));
      expect(comprueba, `${archivo}: ${nombre} no llama a getContexto() al empezar`).toBe(true);
    }
  });
});

describe("importaciones restringidas", () => {
  it("solo lib/db.ts usa el cliente Prisma sin ámbito", () => {
    const usan = CODIGO.filter((f) => /from "@\/lib\/prisma"/.test(readFileSync(f, "utf8")));
    expect(usan).toEqual(["lib/db.ts"]);
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
