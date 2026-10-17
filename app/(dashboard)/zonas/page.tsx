import Link from "next/link";
import { cn } from "@/lib/utils";
import { FileText, Home, MapPinned, Star, Target } from "lucide-react";

import { getContexto } from "@/lib/db";
import { fechaCorta } from "@/lib/actividad";
import { colorZona } from "@/lib/validations/zona";
import { formaZonaSchema } from "@/lib/validations/ubicacion";
import { ipDeLaPeticion } from "@/lib/ubicacion/servidor";
import { esIpPublica, redDeIp } from "@/lib/ubicacion/red";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ZonaDialog } from "@/components/zonas/zona-dialog";
import { EliminarZonaDialog } from "@/components/zonas/eliminar-zona-dialog";
import { DibujarZonaDialog } from "@/components/zonas/dibujar-zona-dialog";
import { ControlUbicacion } from "@/components/zonas/control-ubicacion";
import { Mapa, type ZonaMapa } from "@/components/mapa/mapa";
import { Button } from "@/components/ui/button";

/** Office settings and checks for the location control card (director only). */
async function datosControl(ctx: Awaited<ReturnType<typeof getContexto>>) {
  const [oficina, sinZona, ip] = await Promise.all([
    ctx.db.oficina.findFirst({ select: { controlUbicacion: true, controlUbicacionDesde: true } }),
    ctx.db.usuario.findMany({
      where: { rol: "ASESOR", activo: true, zonasAsignadas: { none: {} } },
      select: { nombre: true },
      orderBy: { nombre: "asc" },
    }),
    ipDeLaPeticion(),
  ]);
  return {
    activo: oficina?.controlUbicacion ?? false,
    desde: fechaCorta(oficina?.controlUbicacionDesde ?? null),
    redActual: { red: ip ? redDeIp(ip) : null, publica: ip ? esIpPublica(ip) : false },
    asesoresSinZona: sinZona.map((u) => u.nombre),
  };
}

export default async function ZonasPage() {
  const ctx = await getContexto();
  const { db, esDirector, zonas: misZonas, ubicacionOficina } = ctx;

  const [zonas, captacion, asesores, control] = await Promise.all([
    db.zona.findMany({
      // An advisor sees only theirs; the badges elsewhere still name any zone.
      where: misZonas ? { id: { in: misZonas } } : undefined,
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        color: true,
        notas: true,
        forma: true,
        asesores: {
          select: { usuario: { select: { id: true, nombre: true, activo: true } } },
          orderBy: { usuario: { nombre: "asc" } },
        },
        _count: { select: { bloques: true, inmuebles: true } },
      },
    }),
    db.inmueble.groupBy({ by: ["zonaId", "captacion"], where: { captacion: { not: null } }, _count: { _all: true } }),
    esDirector
      ? db.usuario.findMany({
          where: { rol: "ASESOR" },
          select: { id: true, nombre: true, activo: true },
          orderBy: [{ activo: "desc" }, { nombre: "asc" }],
        })
      : [],
    esDirector ? datosControl(ctx) : null,
  ]);

  const enMapa: ZonaMapa[] = zonas.map((z) => ({
    id: z.id,
    nombre: z.nombre,
    color: colorZona(z.color).valor,
    forma: formaZonaSchema.safeParse(z.forma).data ?? null,
  }));
  const { latitud, longitud, radioMetros } = ubicacionOficina;
  const oficina = latitud !== null && longitud !== null ? { lat: latitud, lng: longitud, radio: radioMetros } : null;
  const hayMapa = Boolean(oficina) || enMapa.some((z) => z.forma);

  const marcas = (zonaId: string, tipo: "NOTICIA" | "POTENCIAL") =>
    captacion.find((c) => c.zonaId === zonaId && c.captacion === tipo)?._count._all ?? 0;
  const opciones = zonas.map((z) => ({ id: z.id, nombre: z.nombre, color: z.color }));
  const total = zonas.length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Cartera"
        title="Zonas"
        description={
          esDirector
            ? `${total} ${total === 1 ? "zona" : "zonas"}. Cada bloque y cada piso está en una; cada asesor ve solo los de sus zonas.`
            : total
              ? "Las zonas que trabajas. Ves sus bloques y pisos, y los clientes de esos pisos."
              : undefined
        }
        actions={esDirector && <ZonaDialog asesores={asesores} />}
      />

      {(hayMapa || control) && (
        <div className={cn("grid gap-4", control && "lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start")}>
          {hayMapa ? (
            <Mapa zonas={enMapa} oficina={oficina} className="h-80 lg:h-[30rem]" />
          ) : (
            <div className="grid h-80 place-items-center rounded-xl border border-dashed border-border px-6 text-center text-sm text-muted-foreground lg:h-[30rem]">
              Marca la oficina en el mapa y dibuja el contorno de cada zona para verlas aquí.
            </div>
          )}
          {control && (
            <ControlUbicacion
              {...control}
              oficina={oficina}
              redes={ubicacionOficina.redes}
              zonasSinContorno={enMapa.filter((z) => !z.forma).map((z) => z.nombre)}
              zonas={enMapa}
            />
          )}
        </div>
      )}

      {total === 0 ? (
        <EmptyState
          icon={MapPinned}
          title={esDirector ? "Aún no hay zonas" : "Aún no tienes zona asignada"}
          description={
            esDirector
              ? "Crea una zona por cada parte de la oficina y asígnale sus asesores."
              : "Pídesela al director: hasta entonces no verás pisos ni bloques."
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {zonas.map((zona, i) => {
            const mapa = enMapa[i];
            const noticias = marcas(zona.id, "NOTICIA");
            const potenciales = marcas(zona.id, "POTENCIAL");
            return (
              <li
                key={zona.id}
                className="rise flex flex-col overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-foreground/6"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <div aria-hidden className="h-1.5" style={{ backgroundColor: colorZona(zona.color).valor }} />
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="flex flex-col gap-1">
                    <h2 className="flex items-baseline justify-between gap-2 font-display text-3xl leading-none">
                      {zona.nombre}
                      {esDirector && !mapa.forma && (
                        <span className="rounded-full bg-warning/15 px-2 py-0.5 font-sans text-xs font-medium text-warning">
                          Sin contorno
                        </span>
                      )}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {zona.asesores.length
                        ? zona.asesores
                            .map((a) => (a.usuario.activo ? a.usuario.nombre : `${a.usuario.nombre} (desactivado)`))
                            .join(", ")
                        : "Sin asesores asignados"}
                    </p>
                  </div>

                  <dl className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: "Bloques", valor: zona._count.bloques },
                      { label: "Pisos", valor: zona._count.inmuebles },
                      { label: "Noticias", valor: noticias, Icono: Star },
                      { label: "Potenc.", valor: potenciales, Icono: Target, titulo: "Potenciales" },
                    ].map(({ label, valor, Icono, titulo }) => (
                      <div key={label} className="flex flex-col gap-1 rounded-xl bg-surface/70 px-1 py-2.5" title={titulo}>
                        <dt className="eyebrow flex items-center justify-center gap-1 text-[0.62rem]">
                          {Icono && <Icono aria-hidden className="size-3" />}
                          {label}
                        </dt>
                        <dd className="font-display tabular text-2xl leading-none">{valor}</dd>
                      </div>
                    ))}
                  </dl>

                  {zona.notas && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{zona.notas}</p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={
                        <Link href={`/inmuebles?zona=${zona.id}`}>
                          <Home /> Ver pisos
                        </Link>
                      }
                    />
                    {zona._count.inmuebles > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={
                          // A route handler: a plain link that opens the browser's PDF viewer.
                          <a href={`/inmuebles/pdf?zona=${zona.id}&formato=hoja`} target="_blank" rel="noopener">
                            <FileText /> Hoja para la calle
                          </a>
                        }
                      />
                    )}
                    {esDirector && (
                      <span className="ml-auto flex items-center">
                        <DibujarZonaDialog zona={mapa} zonas={enMapa} oficina={oficina} />
                        <ZonaDialog
                          asesores={asesores}
                          zona={{
                            id: zona.id,
                            nombre: zona.nombre,
                            color: zona.color,
                            notas: zona.notas,
                            asesorIds: zona.asesores.map((a) => a.usuario.id),
                          }}
                        />
                        <EliminarZonaDialog
                          zona={zona}
                          otras={opciones.filter((o) => o.id !== zona.id)}
                          bloques={zona._count.bloques}
                          pisos={zona._count.inmuebles}
                        />
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
