import Link from "next/link";
import { Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { InmuebleFiltros } from "@/components/inmuebles/inmueble-filtros";
import { InmueblesTable } from "@/components/inmuebles/inmuebles-table";
import { Pagination } from "@/components/shared/pagination";
import type { Prisma, TipoOperacion, EstadoInmueble } from "@/lib/generated/prisma/client";

const PAGE_SIZE = 20;

export default async function InmueblesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; tipoOperacion?: string; estado?: string }>;
}) {
  const { q, page: pageParam, tipoOperacion, estado } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1") || 1);

  const where: Prisma.InmuebleWhereInput = {
    ...(tipoOperacion ? { tipoOperacion: tipoOperacion as TipoOperacion } : {}),
    ...(estado ? { estado: estado as EstadoInmueble } : {}),
    ...(q
      ? {
          OR: [
            { referencia: { contains: q, mode: "insensitive" } },
            { direccion: { contains: q, mode: "insensitive" } },
            { localidad: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [inmuebles, total] = await Promise.all([
    prisma.inmueble.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.inmueble.count({ where }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inmuebles</h1>
        <Button
          nativeButton={false}
          render={
            <Link href="/inmuebles/nuevo">
              <Plus /> Nuevo inmueble
            </Link>
          }
        />
      </div>

      <InmuebleFiltros defaultQ={q} defaultTipoOperacion={tipoOperacion} defaultEstado={estado} />

      <InmueblesTable inmuebles={inmuebles} />

      <Pagination
        basePath="/inmuebles"
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        params={{ q, tipoOperacion, estado }}
      />
    </div>
  );
}
