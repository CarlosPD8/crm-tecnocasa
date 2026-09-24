import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { getContexto, opcionesAsesor } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { BarraFiltros } from "@/components/shared/filtros/barra-filtros";
import { ClientesTable } from "@/components/clientes/clientes-table";
import { Pagination } from "@/components/shared/pagination";
import { PageHeader } from "@/components/shared/page-header";
import { consultaClientes } from "@/lib/filtros/consultas";
import { contarFiltros, paramsDeFiltros, opcionesFiltroAsesor } from "@/lib/filtros/definiciones";

const PAGE_SIZE = 20;

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { db, esDirector } = await getContexto();
  const sp = await searchParams;
  // Old dashboard links: «pending follow-up» is now a regular filter.
  if (sp.seguimiento === "pendiente") redirect("/clientes?proximo=p:vencido&orden=proximo");

  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const { where, orderBy } = consultaClientes(sp);
  const filtrado = Boolean(sp.q || contarFiltros("clientes", sp));

  const [clientes, total, asesores] = await Promise.all([
    db.cliente.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { asesor: { select: { nombre: true } } },
    }),
    db.cliente.count({ where }),
    opcionesAsesor(db),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Cartera"
        title="Clientes"
        description={`${total} ${total === 1 ? "cliente" : "clientes"}${filtrado ? " con los filtros actuales" : " registrados"}.`}
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
        <BarraFiltros
          entidad="clientes"
          exportar={esDirector ? { total: total } : undefined}
          opciones={{ asesor: opcionesFiltroAsesor(asesores) }}
          ariaBusqueda="Buscar clientes"
          placeholder="Nombre, teléfono, email o DNI…"
        />

        <ClientesTable clientes={clientes} filtrado={filtrado} />
      </div>

      <Pagination
        basePath="/clientes"
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        params={paramsDeFiltros("clientes", sp)}
      />
    </div>
  );
}
