import Link from "next/link";
import { differenceInCalendarDays, format, isToday, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowUpRight, CalendarCheck, Handshake, Home, KeyRound, PhoneCall } from "lucide-react";

import { getContexto } from "@/lib/db";
import { cn } from "@/lib/utils";
import { hoyISO } from "@/lib/filtros/tipos";
import { FinAlquiler } from "@/components/inmuebles/situacion";
import { PageHeader } from "@/components/shared/page-header";
import {
  TIPO_INMUEBLE_LABELS,
  TIPO_OPERACION_LABELS,
} from "@/lib/validations/inmueble";

const formatoPrecio = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function retraso(fecha: Date) {
  if (isToday(fecha)) return { texto: "Hoy", vencido: false };
  const dias = differenceInCalendarDays(new Date(), fecha);
  return { texto: dias === 1 ? "Ayer" : `Hace ${dias} días`, vencido: true };
}

function iniciales(nombre: string, apellidos: string) {
  return `${nombre[0] ?? ""}${apellidos[0] ?? ""}`.toUpperCase();
}

/** A client or a property with a follow-up date, as the panels list them. */
type Seguimiento = {
  clave: string;
  href: string;
  fecha: Date;
  titulo: string;
  detalle: string;
  /** Initials for clients, reference for properties. */
  marca: { tipo: "iniciales" | "referencia"; texto: string };
};

type ClienteSeguimiento = {
  id: string;
  nombre: string;
  apellidos: string;
  telefono: string | null;
  email: string | null;
  fechaProximoContacto: Date | null;
};

type InmuebleSeguimiento = {
  id: string;
  referencia: string;
  direccion: string;
  localidad: string;
  fechaProximoContacto: Date | null;
  propietario: { nombre: string; apellidos: string; telefono: string | null } | null;
};

function seguimientos(clientes: ClienteSeguimiento[], inmuebles: InmuebleSeguimiento[], limite: number) {
  const lista: Seguimiento[] = [
    ...clientes.map((c) => ({
      clave: `c-${c.id}`,
      href: `/clientes/${c.id}`,
      fecha: c.fechaProximoContacto!,
      titulo: `${c.nombre} ${c.apellidos}`,
      detalle: c.telefono ?? c.email ?? "Sin datos de contacto",
      marca: { tipo: "iniciales" as const, texto: iniciales(c.nombre, c.apellidos) },
    })),
    ...inmuebles.map((i) => ({
      clave: `i-${i.id}`,
      href: `/inmuebles/${i.id}`,
      fecha: i.fechaProximoContacto!,
      titulo: i.direccion,
      detalle: i.propietario
        ? [`${i.propietario.nombre} ${i.propietario.apellidos}`, i.propietario.telefono].filter(Boolean).join(" · ")
        : i.localidad,
      marca: { tipo: "referencia" as const, texto: i.referencia },
    })),
  ];
  return lista.sort((a, b) => a.fecha.getTime() - b.fecha.getTime()).slice(0, limite);
}

const selectInmuebleSeguimiento = {
  id: true,
  referencia: true,
  direccion: true,
  localidad: true,
  fechaProximoContacto: true,
  propietario: { select: { nombre: true, apellidos: true, telefono: true } },
} as const;

export default async function DashboardPage() {
  const { db } = await getContexto();
  const ahora = new Date();
  const finDeHoy = new Date(ahora);
  finDeHoy.setHours(23, 59, 59, 999);
  const hoyUTC = new Date(`${hoyISO(ahora)}T00:00:00.000Z`);
  const finAlquilerProximo = { gte: hoyUTC, lt: new Date(hoyUTC.getTime() + 91 * 24 * 60 * 60 * 1000) };

  const [
    totalClientes,
    totalInmueblesDisponibles,
    pendientesClientes,
    pendientesInmuebles,
    operacionesMes,
    clientesPendientes,
    inmueblesPendientes,
    clientesProximos,
    inmueblesProximos,
    inmueblesDisponibles,
    operacionesRecientes,
    finesAlquiler,
    finesAlquilerTotal,
  ] = await Promise.all([
    db.cliente.count(),
    db.inmueble.count({ where: { estado: "DISPONIBLE" } }),
    db.cliente.count({ where: { fechaProximoContacto: { lte: finDeHoy } } }),
    db.inmueble.count({ where: { fechaProximoContacto: { lte: finDeHoy } } }),
    db.operacion.count({ where: { fecha: { gte: subDays(ahora, 30) } } }),
    db.cliente.findMany({
      where: { fechaProximoContacto: { lte: finDeHoy } },
      orderBy: { fechaProximoContacto: "asc" },
      take: 6,
    }),
    db.inmueble.findMany({
      where: { fechaProximoContacto: { lte: finDeHoy } },
      orderBy: { fechaProximoContacto: "asc" },
      take: 6,
      select: selectInmuebleSeguimiento,
    }),
    db.cliente.findMany({
      where: { fechaProximoContacto: { gt: finDeHoy } },
      orderBy: { fechaProximoContacto: "asc" },
      take: 6,
    }),
    db.inmueble.findMany({
      where: { fechaProximoContacto: { gt: finDeHoy } },
      orderBy: { fechaProximoContacto: "asc" },
      take: 6,
      select: selectInmuebleSeguimiento,
    }),
    db.inmueble.findMany({
      where: { estado: "DISPONIBLE" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.operacion.findMany({
      orderBy: { fecha: "desc" },
      take: 5,
      include: { cliente: true, inmueble: true },
    }),
    db.inmueble.findMany({
      where: { fechaFinAlquiler: finAlquilerProximo },
      orderBy: { fechaFinAlquiler: "asc" },
      take: 6,
      select: { id: true, referencia: true, direccion: true, localidad: true, fechaFinAlquiler: true },
    }),
    db.inmueble.count({ where: { fechaFinAlquiler: finAlquilerProximo } }),
  ]);

  const fechaLarga = format(ahora, "EEEE, d 'de' MMMM", { locale: es });
  const pendientesTotal = pendientesClientes + pendientesInmuebles;
  const pendientes = seguimientos(clientesPendientes, inmueblesPendientes, 6);
  const proximos = seguimientos(clientesProximos, inmueblesProximos, 6);
  const verPendientes = [
    ...(pendientesClientes > 0
      ? [{ href: "/clientes?proximo=p:vencido&orden=proximo", label: `Clientes (${pendientesClientes})` }]
      : []),
    ...(pendientesInmuebles > 0
      ? [{ href: "/inmuebles?proximo=p:vencido&orden=proximo", label: `Inmuebles (${pendientesInmuebles})` }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow={fechaLarga}
        title={
          pendientesTotal > 0 ? (
            <>
              Tienes <em className="text-primary">{pendientesTotal}</em>{" "}
              {pendientesTotal === 1 ? "llamada pendiente" : "llamadas pendientes"}
            </>
          ) : (
            <>Agenda al día</>
          )
        }
        description="Resumen de la cartera, seguimiento de clientes y últimos movimientos de la oficina."
      />

      {/* Stat band — the actionable number gets the weight, the rest read as context. */}
      <section
        aria-label="Resumen"
        className="rise grid grid-cols-1 overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-foreground/6 [animation-delay:60ms] sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]"
      >
        <Link
          href={
            pendientesInmuebles > 0 && pendientesClientes === 0
              ? "/inmuebles?proximo=p:vencido&orden=proximo"
              : "/clientes?proximo=p:vencido&orden=proximo"
          }
          className="group relative flex flex-col justify-between gap-6 bg-primary p-6 text-primary-foreground transition-colors duration-300 hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] dark:bg-accent dark:text-accent-foreground dark:hover:bg-[color-mix(in_oklch,var(--accent),white_5%)] sm:col-span-2 lg:col-span-1"
        >
          <span className="flex items-center justify-between text-sm font-medium opacity-90">
            <span className="flex items-center gap-2">
              <PhoneCall className="size-4" /> Pendientes de contacto
            </span>
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
          <span className="flex items-end justify-between gap-4">
            <span className="font-display tabular text-7xl leading-none">{pendientesTotal}</span>
            <span className="max-w-[18ch] text-right text-xs opacity-80">
              {pendientesInmuebles > 0
                ? "clientes e inmuebles con contacto vencido o para hoy"
                : "clientes con contacto vencido o programado para hoy"}
            </span>
          </span>
        </Link>
        <Stat href="/clientes" label="Clientes" value={totalClientes} hint="en cartera" />
        <Stat
          href="/inmuebles?estado=DISPONIBLE"
          label="Disponibles"
          value={totalInmueblesDisponibles}
          hint="inmuebles publicados"
        />
        <Stat label="Operaciones" value={operacionesMes} hint="cerradas en 30 días" />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
          <Panel
            title="Por contactar"
            action={
              pendientesTotal > pendientes.length || pendientesInmuebles > 0 ? verPendientes : undefined
            }
          >
            {pendientes.length === 0 ? (
              <PanelEmpty icon={CalendarCheck} text="Nadie esperando llamada. La agenda de hoy está limpia." />
            ) : (
              pendientes.map((s) => {
                const r = retraso(s.fecha);
                return (
                  <Row key={s.clave} href={s.href}>
                    <Marca marca={s.marca} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{s.titulo}</span>
                      <span className="block truncate text-xs text-muted-foreground">{s.detalle}</span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                        r.vencido
                          ? "bg-destructive/10 text-destructive"
                          : "bg-accent text-accent-foreground"
                      )}
                    >
                      {r.texto}
                    </span>
                  </Row>
                );
              })
            )}
          </Panel>

          <Panel
            title="Inmuebles disponibles"
            action={{ href: "/inmuebles?estado=DISPONIBLE", label: "Ver todos" }}
          >
            {inmueblesDisponibles.length === 0 ? (
              <PanelEmpty icon={Home} text="No hay inmuebles disponibles ahora mismo." />
            ) : (
              inmueblesDisponibles.map((inmueble) => (
                <Row key={inmueble.id} href={`/inmuebles/${inmueble.id}`}>
                  <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                    {inmueble.referencia}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{inmueble.localidad}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {TIPO_INMUEBLE_LABELS[inmueble.tipoInmueble]} ·{" "}
                      {TIPO_OPERACION_LABELS[inmueble.tipoOperacion]}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-sm font-medium">
                    {formatoPrecio.format(Number(inmueble.precio))}
                  </span>
                </Row>
              ))
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:col-span-5">
          <Panel title="Próximos contactos">
            {proximos.length === 0 ? (
              <PanelEmpty icon={CalendarCheck} text="No hay contactos programados." />
            ) : (
              <ol className="relative px-5 py-3">
                <span aria-hidden className="absolute top-6 bottom-6 left-[2.35rem] w-px bg-border" />
                {proximos.map((s) => {
                  const fecha = s.fecha;
                  return (
                    <li key={s.clave}>
                      <Link
                        href={s.href}
                        className="group relative flex items-center gap-4 rounded-lg py-2 text-sm"
                      >
                        <span className="relative z-10 flex w-9 shrink-0 flex-col items-center rounded-md bg-card py-0.5 leading-none ring-1 ring-border">
                          <span className="tabular text-sm font-semibold">{format(fecha, "d")}</span>
                          <span className="text-[0.6rem] text-muted-foreground uppercase">
                            {format(fecha, "MMM", { locale: es })}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium transition-colors group-hover:text-primary">
                          {s.marca.tipo === "referencia" && (
                            <span className="mr-1.5 font-mono text-xs font-normal text-muted-foreground">
                              {s.marca.texto}
                            </span>
                          )}
                          {s.titulo}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground capitalize">
                          {format(fecha, "EEEE", { locale: es })}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>

          <Panel
            title="Alquileres que terminan pronto"
            action={
              finesAlquilerTotal > 0
                ? { href: "/inmuebles?finAlquiler=p:proximos90&orden=finAlquiler", label: finesAlquilerTotal > finesAlquiler.length ? `Ver los ${finesAlquilerTotal}` : "Ver en inmuebles" }
                : undefined
            }
          >
            {finesAlquiler.length === 0 ? (
              <PanelEmpty icon={KeyRound} text="Ningún alquiler termina en los próximos 90 días." />
            ) : (
              finesAlquiler.map((inmueble) => (
                <Row key={inmueble.id} href={`/inmuebles/${inmueble.id}`}>
                  <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{inmueble.referencia}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{inmueble.direccion}</span>
                    <span className="block truncate text-xs text-muted-foreground">{inmueble.localidad}</span>
                  </span>
                  <FinAlquiler fecha={inmueble.fechaFinAlquiler} className="shrink-0 flex-col items-end gap-1 text-xs sm:flex-row sm:items-center sm:gap-2" />
                </Row>
              ))
            )}
          </Panel>

          <Panel title="Operaciones recientes">
            {operacionesRecientes.length === 0 ? (
              <PanelEmpty icon={Handshake} text="Todavía no se ha cerrado ninguna operación." />
            ) : (
              operacionesRecientes.map((operacion) => (
                <Row key={operacion.id} href={`/inmuebles/${operacion.inmuebleId}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {operacion.cliente.nombre} {operacion.cliente.apellidos}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      <span className="font-mono">{operacion.inmueble.referencia}</span> ·{" "}
                      {TIPO_OPERACION_LABELS[operacion.tipoOperacion]}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="tabular block text-sm font-medium">
                      {formatoPrecio.format(Number(operacion.precioFinal))}
                    </span>
                    <span className="tabular block text-xs text-muted-foreground">
                      {format(operacion.fecha, "dd/MM/yyyy")}
                    </span>
                  </span>
                </Row>
              ))
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number;
  hint: string;
  href?: string;
}) {
  const body = (
    <>
      <span className="eyebrow">{label}</span>
      <span className="flex flex-col gap-1">
        <span className="font-display tabular text-5xl leading-none">{value}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
    </>
  );
  const className =
    "flex flex-col justify-between gap-6 border-t border-border/70 p-6 sm:border-l lg:border-t-0";

  return href ? (
    <Link href={href} className={cn(className, "transition-colors duration-200 hover:bg-surface/70")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: PanelAction | PanelAction[];
  children: React.ReactNode;
}) {
  const acciones = action ? [action].flat() : [];
  return (
    <section className="rise overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-foreground/6 [animation-delay:120ms]">
      <header className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3.5">
        <h2 className="text-sm font-semibold tracking-[-0.01em]">{title}</h2>
        {acciones.length > 0 && (
          <span className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
            {acciones.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group flex items-center gap-1 whitespace-nowrap text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {a.label}
                <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            ))}
          </span>
        )}
      </header>
      <div className="flex flex-col divide-y divide-border/60">{children}</div>
    </section>
  );
}

function Row({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 px-5 py-3 text-sm transition-colors duration-150 hover:bg-surface/70 focus-visible:bg-surface focus-visible:outline-none"
    >
      {children}
    </Link>
  );
}

type PanelAction = { href: string; label: string };

function Marca({ marca }: { marca: Seguimiento["marca"] }) {
  if (marca.tipo === "referencia") {
    return <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{marca.texto}</span>;
  }
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-[30%] bg-secondary text-xs font-semibold text-secondary-foreground">
      {marca.texto}
    </span>
  );
}

function PanelEmpty({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <p className="flex items-center gap-3 px-5 py-8 text-sm text-muted-foreground">
      <Icon className="size-4 shrink-0" />
      {text}
    </p>
  );
}
