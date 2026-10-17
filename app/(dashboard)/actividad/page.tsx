import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { History, SearchX } from "lucide-react";

import { requireDirector, type DbOficina } from "@/lib/db";
import { consultaActividad } from "@/lib/filtros/consultas";
import { contarFiltros, paramsDeFiltros } from "@/lib/filtros/definiciones";
import { hoyISO, type RangoFecha } from "@/lib/filtros/tipos";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { BarraFiltros } from "@/components/shared/filtros/barra-filtros";
import {
  DiaActividad,
  nombreDia,
  type FilaActividad,
  type PersonaActividad,
} from "@/components/actividad/dia-actividad";

const DIAS_POR_PAGINA = 7;

const ISO = (d: Date) => d.toISOString().slice(0, 10);

/** «14 de octubre de 2026». */
const fechaCompleta = (dia: string) => format(parseISO(dia), "d 'de' MMMM 'de' yyyy", { locale: es });

/** «Hoy, 14 de octubre de 2026», «Del 7 de octubre de 2026 al 14 de octubre de 2026»… */
function describirRango(r: RangoFecha, hoy: string, ayer: string) {
  if (r.sin) return "";
  if (r.desde && r.desde === r.hasta) {
    return [hoy, ayer].includes(r.desde)
      ? `${nombreDia(r.desde, hoy, ayer)}, ${fechaCompleta(r.desde)}`
      : fechaCompleta(r.desde);
  }
  if (r.desde && r.hasta) return `Del ${fechaCompleta(r.desde)} al ${fechaCompleta(r.hasta)}`;
  return r.desde ? `Desde el ${fechaCompleta(r.desde)}` : `Hasta el ${fechaCompleta(r.hasta!)}`;
}

const RUTA_FICHA = /^\/(clientes|inmuebles|bloques)\/([^/]+)$/;

/** Links on this page whose record still exists (deleted ones are shown as plain text). */
async function enlacesVigentes(db: DbOficina, filas: FilaActividad[]) {
  const ids = { clientes: new Set<string>(), inmuebles: new Set<string>(), bloques: new Set<string>() };
  const vigentes = new Set<string>();
  for (const { enlace } of filas) {
    if (!enlace) continue;
    const m = RUTA_FICHA.exec(enlace);
    if (m) ids[m[1] as keyof typeof ids].add(m[2]);
    else vigentes.add(enlace);
  }
  const consulta = { select: { id: true } } as const;
  const [clientes, inmuebles, bloques] = await Promise.all([
    ids.clientes.size ? db.cliente.findMany({ where: { id: { in: [...ids.clientes] } }, ...consulta }) : [],
    ids.inmuebles.size ? db.inmueble.findMany({ where: { id: { in: [...ids.inmuebles] } }, ...consulta }) : [],
    ids.bloques.size ? db.bloque.findMany({ where: { id: { in: [...ids.bloques] } }, ...consulta }) : [],
  ]);
  for (const c of clientes) vigentes.add(`/clientes/${c.id}`);
  for (const i of inmuebles) vigentes.add(`/inmuebles/${i.id}`);
  for (const b of bloques) vigentes.add(`/bloques/${b.id}`);
  return vigentes;
}

export default async function ActividadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { db, oficina } = await requireDirector();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const { where, dias: rango } = consultaActividad(sp);
  const filtrado = Boolean(sp.q || sp.persona || sp.tipo);

  const [diasConActividad, total, usuarios] = await Promise.all([
    db.actividad.groupBy({ by: ["dia"], where, orderBy: { dia: "desc" } }),
    db.actividad.count({ where }),
    db.usuario.findMany({
      select: { id: true, nombre: true, rol: true, activo: true },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    }),
  ]);

  const diasPagina = diasConActividad.slice((page - 1) * DIAS_POR_PAGINA, page * DIAS_POR_PAGINA).map((d) => d.dia);
  const filas = diasPagina.length
    ? await db.actividad.findMany({
        where: { AND: [where, { dia: { in: diasPagina } }] },
        orderBy: { fecha: "asc" },
        select: {
          id: true,
          fecha: true,
          dia: true,
          accion: true,
          entidad: true,
          enlace: true,
          resumen: true,
          detalle: true,
          cambios: true,
          lugar: true,
          creadoPorId: true,
        },
      })
    : [];
  const vigentes = await enlacesVigentes(db, filas);

  // Day → person → lines, in the order the days were fetched (most recent first).
  const porDia = new Map<string, Map<string, FilaActividad[]>>(diasPagina.map((d) => [ISO(d), new Map()]));
  for (const fila of filas) {
    const personas = porDia.get(ISO(fila.dia))!;
    const clave = fila.creadoPorId ?? "";
    personas.set(clave, [...(personas.get(clave) ?? []), fila]);
  }

  const personas = new Map<string, PersonaActividad>(
    usuarios.map((u) => [u.id, { id: u.id, nombre: u.nombre, esDirector: u.rol === "DIRECTOR" }])
  );
  // «Nobody did anything» only makes sense when every kind of line is shown.
  const seleccion = sp.persona?.split(",") ?? null;
  const candidatosSinActividad = sp.tipo || sp.q
    ? []
    : usuarios.filter((u) => u.activo && (!seleccion || seleccion.includes(u.id)));

  const hoy = hoyISO();
  const ayer = ISO(new Date(new Date(`${hoy}T00:00:00.000Z`).getTime() - 24 * 60 * 60 * 1000));
  const opcionesPersona = Object.fromEntries(
    usuarios.map((u) => [u.id, u.activo ? u.nombre : `${u.nombre} (desactivado)`])
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={`Oficina ${oficina.nombre}`}
        title="Actividad"
        description={`${describirRango(rango, hoy, ayer)}. Qué ha hecho cada persona del equipo, día a día: cuándo entró en la app, a quién llamó y qué dio de alta, cambió o borró.`}
      />

      <div className="flex flex-col gap-4">
        <BarraFiltros
          entidad="actividad"
          exportar={{ total }}
          ariaBusqueda="Buscar en la actividad"
          placeholder="GR-2401, Lucía, «precio»…"
          opciones={{ persona: opcionesPersona }}
        />

        {diasPagina.length === 0 ? (
          filtrado || contarFiltros("actividad", sp) ? (
            <EmptyState
              icon={SearchX}
              title="Nada con estos filtros"
              description="Prueba con otras fechas, otra persona u otro tipo, o quita algún filtro."
            />
          ) : (
            <EmptyState
              icon={History}
              title="Sin actividad en estos días"
              description="Aquí aparecerá lo que haga cada persona: entradas en la app, contactos, altas, cambios y borrados."
            />
          )
        ) : (
          <div className="flex flex-col gap-6">
            {[...porDia.entries()].map(([dia, porPersona]) => (
              <DiaActividad
                key={dia}
                titulo={nombreDia(dia, hoy, ayer)}
                subtitulo={[hoy, ayer].includes(dia) ? fechaCompleta(dia) : undefined}
                porPersona={porPersona}
                personas={personas}
                sinActividad={candidatosSinActividad.filter((u) => !porPersona.has(u.id)).map((u) => personas.get(u.id)!)}
                vigentes={vigentes}
              />
            ))}
          </div>
        )}
      </div>

      <Pagination
        basePath="/actividad"
        page={page}
        pageSize={DIAS_POR_PAGINA}
        total={diasConActividad.length}
        params={paramsDeFiltros("actividad", sp)}
      />
    </div>
  );
}
