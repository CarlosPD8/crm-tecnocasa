import Link from "next/link";
import { Building, Plus, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENLACE_FILA, FILA_CLICABLE } from "@/components/shared/row-link";

import { prisma } from "@/lib/prisma";
import { resumenPorBloque } from "@/lib/bloques";
import { formatBloque } from "@/lib/validations/bloque";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { BloqueFiltros } from "@/components/bloques/bloque-filtros";
import { OcupacionBar } from "@/components/bloques/ocupacion-bar";
import { PotencialBadge } from "@/components/inmuebles/situacion";
import type { Prisma } from "@/lib/generated/prisma/client";

const PAGE_SIZE = 20;

export default async function BloquesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1") || 1);

  const where: Prisma.BloqueWhereInput = q
    ? {
        OR: [
          { calle: { contains: q, mode: "insensitive" } },
          { numero: { contains: q, mode: "insensitive" } },
          { nombre: { contains: q, mode: "insensitive" } },
          { localidad: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [bloques, total] = await Promise.all([
    prisma.bloque.findMany({
      where,
      orderBy: [{ calle: "asc" }, { numero: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { inmuebles: true } } },
    }),
    prisma.bloque.count({ where }),
  ]);
  const resumen = await resumenPorBloque(bloques.map((b) => b.id));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Cartera"
        title="Bloques"
        description={`${total} ${total === 1 ? "edificio" : "edificios"}${q ? " con la búsqueda actual" : ""}. Agrupa los pisos de un mismo portal para ver su ocupación de un vistazo.`}
        actions={
          <Button
            size="lg"
            nativeButton={false}
            render={
              <Link href="/bloques/nuevo">
                <Plus /> Nuevo bloque
              </Link>
            }
          />
        }
      />

      <div className="flex flex-col gap-4">
        <BloqueFiltros defaultQ={q} />

        {bloques.length === 0 ? (
          q ? (
            <EmptyState
              icon={SearchX}
              title="Ningún bloque coincide con la búsqueda"
              description="Prueba con otra calle, número o nombre del edificio."
            />
          ) : (
            <EmptyState
              icon={Building}
              title="Aún no hay bloques"
              description="Crea un bloque por cada edificio y asígnale sus pisos para verlos juntos."
              action={
                <Button nativeButton={false} render={<Link href="/bloques/nuevo">Añadir bloque</Link>} />
              }
            />
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bloque</TableHead>
                <TableHead>Localidad</TableHead>
                <TableHead className="text-right">Pisos</TableHead>
                <TableHead>Ocupación</TableHead>
                <TableHead>Potenciales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bloques.map((bloque) => {
                const r = resumen.get(bloque.id)!;
                return (
                  <TableRow key={bloque.id} className={FILA_CLICABLE}>
                    <TableCell>
                      <Link
                        href={`/bloques/${bloque.id}`}
                        data-row-link
                        className={cn("flex items-center gap-3", ENLACE_FILA)}
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-[30%] bg-secondary text-secondary-foreground">
                          <Building className="size-4" />
                        </span>
                        <span>
                          <span className="block font-medium">{formatBloque(bloque)}</span>
                          {bloque.nombre && (
                            <span className="block text-xs text-muted-foreground">{bloque.nombre}</span>
                          )}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{bloque.localidad}</TableCell>
                    <TableCell className="text-right font-medium">{bloque._count.inmuebles}</TableCell>
                    <TableCell>
                      <OcupacionBar resumen={r.ocupacion} />
                    </TableCell>
                    <TableCell>
                      {r.potenciales > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <PotencialBadge compact />
                          <span className="tabular font-medium">{r.potenciales}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Pagination basePath="/bloques" page={page} pageSize={PAGE_SIZE} total={total} params={{ q }} />
    </div>
  );
}
