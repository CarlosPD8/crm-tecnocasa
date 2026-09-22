import Link from "next/link";
import { Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { BarraFiltros } from "@/components/shared/filtros/barra-filtros";
import { InmueblesTable } from "@/components/inmuebles/inmuebles-table";
import { Pagination } from "@/components/shared/pagination";
import { PageHeader } from "@/components/shared/page-header";
import { consultaInmuebles } from "@/lib/filtros/consultas";
import { contarFiltros, paramsDeFiltros } from "@/lib/filtros/definiciones";

const PAGE_SIZE = 20;

export default async function InmueblesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const { where, orderBy } = consultaInmuebles(sp);
  const filtrado = Boolean(sp.q || contarFiltros("inmuebles", sp));

  const [inmuebles, total, localidades] = await Promise.all([
    prisma.inmueble.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { bloque: { select: { id: true, calle: true, numero: true } } },
    }),
    prisma.inmueble.count({ where }),
    prisma.inmueble.findMany({ distinct: ["localidad"], select: { localidad: true }, orderBy: { localidad: "asc" } }),
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
        <BarraFiltros
          entidad="inmuebles"
          ariaBusqueda="Buscar inmuebles"
          placeholder="Referencia, dirección, bloque, propietario…"
          opciones={{ localidad: Object.fromEntries(localidades.map((l) => [l.localidad, l.localidad])) }}
        />

        <InmueblesTable inmuebles={inmuebles} filtrado={filtrado} />
      </div>

      <Pagination
        basePath="/inmuebles"
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        params={paramsDeFiltros("inmuebles", sp)}
      />
    </div>
  );
}
