import Link from "next/link";
import { differenceInCalendarDays, format, isToday, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowUpRight, CalendarCheck, Handshake, Home, PhoneCall } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
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

export default async function DashboardPage() {
  const ahora = new Date();
  const finDeHoy = new Date(ahora);
  finDeHoy.setHours(23, 59, 59, 999);

  const [
    totalClientes,
    totalInmueblesDisponibles,
    pendientesTotal,
    operacionesMes,
    pendientes,
    proximos,
    inmueblesDisponibles,
    operacionesRecientes,
  ] = await Promise.all([
    prisma.cliente.count(),
    prisma.inmueble.count({ where: { estado: "DISPONIBLE" } }),
    prisma.cliente.count({ where: { fechaProximoContacto: { lte: finDeHoy } } }),
    prisma.operacion.count({ where: { fecha: { gte: subDays(ahora, 30) } } }),
    prisma.cliente.findMany({
      where: { fechaProximoContacto: { lte: finDeHoy } },
      orderBy: { fechaProximoContacto: "asc" },
      take: 6,
    }),
    prisma.cliente.findMany({
      where: { fechaProximoContacto: { gt: finDeHoy } },
      orderBy: { fechaProximoContacto: "asc" },
      take: 6,
    }),
    prisma.inmueble.findMany({
      where: { estado: "DISPONIBLE" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.operacion.findMany({
      orderBy: { fecha: "desc" },
      take: 5,
      include: { cliente: true, inmueble: true },
    }),
  ]);

  const fechaLarga = format(ahora, "EEEE, d 'de' MMMM", { locale: es });

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
        className="rise grid overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-foreground/6 [animation-delay:60ms] sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]"
      >
        <Link
          href="/clientes?seguimiento=pendiente"
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
              clientes con contacto vencido o programado para hoy
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

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <Panel
            title="Por contactar"
            action={
              pendientesTotal > pendientes.length
                ? { href: "/clientes?seguimiento=pendiente", label: `Ver los ${pendientesTotal}` }
                : undefined
            }
          >
            {pendientes.length === 0 ? (
              <PanelEmpty icon={CalendarCheck} text="Nadie esperando llamada. La agenda de hoy está limpia." />
            ) : (
              pendientes.map((cliente) => {
                const r = retraso(cliente.fechaProximoContacto!);
                return (
                  <Row key={cliente.id} href={`/clientes/${cliente.id}`}>
                    <Avatar text={iniciales(cliente.nombre, cliente.apellidos)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {cliente.nombre} {cliente.apellidos}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {cliente.telefono ?? cliente.email ?? "Sin datos de contacto"}
                      </span>
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

        <div className="flex flex-col gap-6 lg:col-span-5">
          <Panel title="Próximos contactos">
            {proximos.length === 0 ? (
              <PanelEmpty icon={CalendarCheck} text="No hay contactos programados." />
            ) : (
              <ol className="relative px-5 py-3">
                <span aria-hidden className="absolute top-6 bottom-6 left-[2.35rem] w-px bg-border" />
                {proximos.map((cliente) => {
                  const fecha = cliente.fechaProximoContacto!;
                  return (
                    <li key={cliente.id}>
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="group relative flex items-center gap-4 rounded-lg py-2 text-sm"
                      >
                        <span className="relative z-10 flex w-9 shrink-0 flex-col items-center rounded-md bg-card py-0.5 leading-none ring-1 ring-border">
                          <span className="tabular text-sm font-semibold">{format(fecha, "d")}</span>
                          <span className="text-[0.6rem] text-muted-foreground uppercase">
                            {format(fecha, "MMM", { locale: es })}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium transition-colors group-hover:text-primary">
                          {cliente.nombre} {cliente.apellidos}
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
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="rise overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-foreground/6 [animation-delay:120ms]">
      <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
        <h2 className="text-sm font-semibold tracking-[-0.01em]">{title}</h2>
        {action && (
          <Link
            href={action.href}
            className="group flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            {action.label}
            <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
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

function Avatar({ text }: { text: string }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-[30%] bg-secondary text-xs font-semibold text-secondary-foreground">
      {text}
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
