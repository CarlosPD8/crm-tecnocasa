// Prepares the throwaway database for the isolation tests, if there is one.
//
//   docker run -d --rm --name crm-test-db -e POSTGRES_PASSWORD=test -e POSTGRES_DB=crm_test -p 55432:5432 postgres:17
//   TEST_DATABASE_URL=postgresql://postgres:test@localhost:55432/crm_test npm test
//
// It WIPES that database and applies every migration (plus the pending ones in
// prisma/pendiente/), so it refuses anything that could be the real one.

import { execSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const REF_PRODUCCION = "clmipqthmunvkgvnsyuj";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.log("\n[tests] Sin TEST_DATABASE_URL: se omiten las pruebas de aislamiento en base de datos.\n");
    return;
  }
  const host = new URL(url).hostname;
  if (url.includes(REF_PRODUCCION) || url.includes("supabase") || !["localhost", "127.0.0.1"].includes(host)) {
    throw new Error(`TEST_DATABASE_URL debe ser un Postgres local de pruebas, nunca ${host}.`);
  }

  const db = new Client({ connectionString: url });
  await db.connect();
  await db.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await db.end();

  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DIRECT_URL: url, DATABASE_URL: url },
  });

  // Migrations prepared but not yet released to production (e.g. the contract step).
  const pendientes = path.resolve("prisma/pendiente");
  if (existsSync(pendientes)) {
    const conexion = new Client({ connectionString: url });
    await conexion.connect();
    for (const carpeta of readdirSync(pendientes).sort()) {
      await conexion.query(readFileSync(path.join(pendientes, carpeta, "migration.sql"), "utf8"));
    }
    await conexion.end();
  }
}
