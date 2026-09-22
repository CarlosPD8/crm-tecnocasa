import Link from "next/link";
import { Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { InmuebleFiltros } from "@/components/inmuebles/inmueble-filtros";
import { InmueblesTable } from "@/components/inmuebles/inmuebles-table";
import { Pagination } from "@/components/shared/pagination";
import { PageHeader } from "@/components/shared/page-header";
import { OCUPACION_FORM_VALUES } from "@/lib/validations/inmueble";
import type { Prisma, TipoOperacion, EstadoInmueble } from "@/lib/generated/prisma/client";

const PAGE_SIZE = 20;

export default async function InmueblesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    tipoOperacion?: string;
    estado?: string;
    ocupacion?: string;
    potencial?: string;
  }>;
}) {
  const { q, page: pageParam, tipoOperacion, estado, ocupacion: ocupacionParam, potencial: potencialParam } =
    await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  // Ignore unknown values instead of letting Prisma throw on a bad enum.
  const ocupacion = OCUPACION_FORM_VALUES.find((v) => v === ocupacionParam);
  const soloPotenciales = potencialParam === "1";

  const where: Prisma.InmuebleWhereInput = {
    ...(tipoOperacion ? { tipoOperacion: tipoOperacion as TipoOperacion } : {}),
    ...(estado ? { estado: estado as EstadoInmueble } : {}),
    ...(ocupacion ? { ocupacion: ocupacion === "SIN_DATOS" ? null : ocupacion } : {}),
    ...(soloPotenciales ? { adquisicionPotencial: true } : {}),
    ...(q
      ? {
          OR: [
            { referencia: { contains: q, mode: "insensitive" } },
            { direccion: { contains: q, mode: "insensitive" } },
            { localidad: { contains: q, mode: "insensitive" } },
            { bloque: { calle: { contains: q, mode: "insensitive" } } },
            { bloque: { nombre: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const filtrado = Boolean(q || tipoOperacion || estado || ocupacion || soloPotenciales);

  const [inmuebles, total] = await Promise.all([
    prisma.inmueble.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { bloque: { select: { id: true, calle: true, numero: true } } },
    }),
    prisma.inmueble.count({ where }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Cartera"
        title="Inmuebles"
        description={`${total} ${total === 1 ? "inmueble" : "inmuebles"}${filtrado ? " con los filtros actuales" : " en cartera"}.`}
        actions={
          <Button
            size="lg"
            nativeButton={false}
            render={
              <Link href="/inmuebles/nuevo">
                <Plus /> Nuevo inmueble
              </Link>
            }
          />
        }
      />

      <div className="flex flex-col gap-4">
        <InmuebleFiltros
          defaultQ={q}
          defaultTipoOperacion={tipoOperacion}
          defaultEstado={estado}
          defaultOcupacion={ocupacion}
          defaultPotencial={soloPotenciales}
        />

        <InmueblesTable inmuebles={inmuebles} filtrado={filtrado} />
      </div>

      <Pagination
        basePath="/inmuebles"
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        params={{ q, tipoOperacion, estado, ocupacion, potencial: soloPotenciales ? "1" : undefined }}
      />
    </div>
  );
}
