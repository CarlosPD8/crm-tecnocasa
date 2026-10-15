import Link from "next/link";
import { MapPinned, Plus } from "lucide-react";

import { getContexto, opcionesAsesor, zonasVisibles } from "@/lib/db";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { BarraFiltros } from "@/components/shared/filtros/barra-filtros";
import { InmueblesTable } from "@/components/inmuebles/inmuebles-table";
import { Pagination } from "@/components/shared/pagination";
import { PageHeader } from "@/components/shared/page-header";
import { consultaInmuebles } from "@/lib/filtros/consultas";
import { contarFiltros, paramsDeFiltros, opcionesFiltroAsesor } from "@/lib/filtros/definiciones";

const PAGE_SIZE = 20;

export default async function InmueblesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await getContexto();
  const { db, esDirector } = ctx;
  const sinZona = ctx.zonas?.length === 0;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const { where, orderBy } = consultaInmuebles(sp);
  const filtrado = Boolean(sp.q || contarFiltros("inmuebles", sp));

  const [inmuebles, total, localidades, asesores, zonas] = await Promise.all([
    db.inmueble.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        bloque: { select: { id: true, calle: true, numero: true } },
        zona: { select: { nombre: true, color: true } },
        asesor: { select: { nombre: true } },
      },
    }),
    db.inmueble.count({ where }),
    db.inmueble.findMany({ distinct: ["localidad"], select: { localidad: true }, orderBy: { localidad: "asc" } }),
    opcionesAsesor(db),
    zonasVisibles(ctx),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Cartera"
        title="Inmuebles"
        description={`${total} ${total === 1 ? "inmueble" : "inmuebles"}${filtrado ? " con los filtros actuales" : " en cartera"}.`}
        actions={
          !sinZona && (
            <Button
              size="lg"
              nativeButton={false}
              render={
                <Link href="/inmuebles/nuevo">
                  <Plus /> Nuevo inmueble
                </Link>
              }
            />
          )
        }
      />

      <div className="flex flex-col gap-4">
        <BarraFiltros
          entidad="inmuebles"
          exportar={esDirector ? { total: total } : undefined}
          pdf={{ total, hoja: true }}
          ariaBusqueda="Buscar inmuebles"
          placeholder="Referencia, dirección, bloque, propietario…"
          opciones={{
            zona: Object.fromEntries(zonas.map((z) => [z.id, z.nombre])),
            localidad: Object.fromEntries(localidades.map((l) => [l.localidad, l.localidad])),
            asesor: opcionesFiltroAsesor(asesores),
          }}
        />

        {sinZona && !total ? (
          <EmptyState
            icon={MapPinned}
            title="Aún no tienes zona asignada"
            description="Pídesela al director: hasta entonces no verás pisos ni bloques."
          />
        ) : (
          <InmueblesTable inmuebles={inmuebles} filtrado={filtrado} />
        )}
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
