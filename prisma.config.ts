import { config } from "dotenv";

config({ path: ".env.local" });

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // El CLI (migrate, db push, introspect...) usa la conexión DIRECTA, sin
  // pooler: las migraciones necesitan bloqueos de advisory lock y DDL que no
  // funcionan bien a través de un pgbouncer en modo transacción. La app en
  // runtime usa su propio adapter (ver lib/prisma.ts) con DATABASE_URL
  // (pooled), independiente de esta configuración del CLI.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
