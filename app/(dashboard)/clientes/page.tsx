import Link from "next/link";
import { PhoneCall, Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ClienteFiltros } from "@/components/clientes/cliente-filtros";
import { ClientesTable } from "@/components/clientes/clientes-table";
import { Pagination } from "@/components/shared/pagination";
import { PageHeader } from "@/components/shared/page-header";
import type { Prisma, TipoCliente } from "@/lib/generated/prisma/client";

const PAGE_SIZE = 20;

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; tipo?: string; seguimiento?: string }>;
}) {
  const { q, page: pageParam, tipo, seguimiento } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const soloPendientes = seguimiento === "pendiente";

  const finDeHoy = new Date();
  finDeHoy.setHours(23, 59, 59, 999);

  const where: Prisma.ClienteWhereInput = {
    ...(tipo ? { tipoCliente: tipo as TipoCliente } : {}),
    ...(soloPendientes ? { fechaProximoContacto: { lte: finDeHoy } } : {}),
    ...(q
      ? {
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { apellidos: { contains: q, mode: "insensitive" } },
            { telefono: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      orderBy: soloPendientes
        ? { fechaProximoContacto: "asc" }
        : { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.cliente.count({ where }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Cartera"
        title="Clientes"
        description={`${total} ${total === 1 ? "cliente" : "clientes"}${q || tipo || soloPendientes ? " con los filtros actuales" : " registrados"}.`}
        actions={
          <Button
            size="lg"
            nativeButton={false}
            render={
              <Link href="/clientes/nuevo">
                <Plus /> Nuevo cliente
              </Link>
            }
          />
        }
      />

      <div className="flex flex-col gap-4">
        {soloPendientes && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-accent px-4 py-2.5 text-sm text-accent-foreground">
            <span className="flex items-center gap-2">
              <PhoneCall className="size-4" />
              Solo clientes con contacto vencido o para hoy.
            </span>
            <Link href="/clientes" className="font-medium underline-offset-4 hover:underline">
              Quitar filtro
            </Link>
          </div>
        )}

        <ClienteFiltros defaultQ={q} defaultTipo={tipo} />

        <ClientesTable clientes={clientes} filtrado={Boolean(q || tipo || soloPendientes)} />
      </div>

      <Pagination
        basePath="/clientes"
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        params={{ q, tipo, seguimiento }}
      />
    </div>
  );
}
