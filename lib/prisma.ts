import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Supavisor occasionally routes a checkout to a node that cannot reach the
// database (08006 "Failed to connect to database: {:error, :nxdomain}"). The
// statement never ran, so retrying is safe; the next checkout usually lands on
// a healthy node.
const REINTENTOS = 2;
const ERROR_CONEXION = /08006|Failed to connect to database|nxdomain|ECONNRESET|ETIMEDOUT|Connection terminated|timeout exceeded when trying to connect/i;

function esErrorDeConexion(error: unknown) {
  if (!(error instanceof Error)) return false;
  const cause = (error as { cause?: unknown }).cause;
  return ERROR_CONEXION.test(`${error.message} ${cause instanceof Error ? cause.message : ""}`);
}

function crearCliente() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    // pg waits forever by default: a stuck handshake would hang the page.
    connectionTimeoutMillis: 8_000,
  });

  return new PrismaClient({ adapter }).$extends({
    query: {
      async $allOperations({ args, query }) {
        for (let intento = 0; ; intento++) {
          try {
            return await query(args);
          } catch (error) {
            if (intento >= REINTENTOS || !esErrorDeConexion(error)) throw error;
            await new Promise((r) => setTimeout(r, 150 * (intento + 1)));
          }
        }
      },
    },
  });
}

type ClienteExtendido = ReturnType<typeof crearCliente>;

const globalForPrisma = globalThis as unknown as {
  prisma: ClienteExtendido | undefined;
};

export const prisma = globalForPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
