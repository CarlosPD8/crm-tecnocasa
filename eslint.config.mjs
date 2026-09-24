import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Office isolation: data goes through getContexto() → ctx.db (lib/db.ts), and
// the service-role Supabase client only where access has been checked.
const PRISMA_SIN_AMBITO = {
  name: "@/lib/prisma",
  message: "Usa getContexto() de @/lib/db: el cliente sin ámbito ve todas las oficinas.",
  allowTypeImports: true,
};
const SUPABASE_ADMIN = {
  name: "@/lib/supabase/admin",
  message: "El cliente service-role solo se usa en storage, cuenta y equipo, tras comprobar permisos.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/db.ts", "lib/supabase/storage.ts", "lib/actions/cuenta.ts", "lib/actions/equipo.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: [PRISMA_SIN_AMBITO, SUPABASE_ADMIN] }],
    },
  },
  {
    files: ["lib/supabase/storage.ts", "lib/actions/cuenta.ts", "lib/actions/equipo.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: [PRISMA_SIN_AMBITO] }],
    },
  },
  {
    // CLI scripts and the seed run outside the app with their own clients.
    files: ["scripts/**", "prisma/**"],
    rules: { "no-restricted-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "lib/generated/**",
  ]),
]);

export default eslintConfig;
