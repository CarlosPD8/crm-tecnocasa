import Link from "next/link";
import { format, isPast, isToday } from "date-fns";
import { Users, Building2, PhoneCall, Handshake } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TIPO_INMUEBLE_LABELS,
  TIPO_OPERACION_LABELS,
} from "@/lib/validations/inmueble";

const formatoPrecio = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatFechaContacto(fecha: Date) {
  if (isToday(fecha)) return "Hoy";
  if (isPast(fecha)) return `Venció el ${format(fecha, "dd/MM/yyyy")}`;
  return format(fecha, "dd/MM/yyyy");
}

export default async function DashboardPage() {
  const finDeHoy = new Date();
  finDeHoy.setHours(23, 59, 59, 999);

  const [
    totalClientes,
    totalInmueblesDisponibles,
    pendientesTotal,
    pendientes,
    proximos,
    inmueblesDisponibles,
    operacionesRecientes,
  ] = await Promise.all([
    prisma.cliente.count(),
    prisma.inmueble.count({ where: { estado: "DISPONIBLE" } }),
    prisma.cliente.count({ where: { fechaProximoContacto: { lte: finDeHoy } } }),
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
      take: 6,
    }),
    prisma.operacion.findMany({
      orderBy: { fecha: "desc" },
      take: 5,
      include: { cliente: true, inmueble: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Panel principal</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/clientes">
          <Card>
            <CardContent className="flex items-center gap-3">
              <Users className="size-8 text-primary" />
              <div>
                <p className="text-2xl font-semibold">{totalClientes}</p>
                <p className="text-xs text-muted-foreground">Clientes totales</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inmuebles?estado=DISPONIBLE">
          <Card>
            <CardContent className="flex items-center gap-3">
              <Building2 className="size-8 text-primary" />
              <div>
                <p className="text-2xl font-semibold">{totalInmueblesDisponibles}</p>
                <p className="text-xs text-muted-foreground">Inmuebles disponibles</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/clientes?seguimiento=pendiente">
          <Card>
            <CardContent className="flex items-center gap-3">
              <PhoneCall className="size-8 text-primary" />
              <div>
                <p className="text-2xl font-semibold">{pendientesTotal}</p>
                <p className="text-xs text-muted-foreground">Pendientes de contacto</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent className="flex items-center gap-3">
            <Handshake className="size-8 text-primary" />
            <div>
              <p className="text-2xl font-semibold">{operacionesRecientes.length}</p>
              <p className="text-xs text-muted-foreground">Últimas operaciones</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clientes pendientes de contactar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {pendientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay clientes pendientes de contactar. Buen trabajo.
              </p>
            ) : (
              pendientes.map((cliente) => (
                <Link
                  key={cliente.id}
                  href={`/clientes/${cliente.id}`}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <span className="font-medium">
                    {cliente.nombre} {cliente.apellidos}
                  </span>
                  <Badge variant="secondary">
                    {formatFechaContacto(cliente.fechaProximoContacto!)}
                  </Badge>
                </Link>
              ))
            )}
            {pendientesTotal > pendientes.length && (
              <Link
                href="/clientes?seguimiento=pendiente"
                className="mt-1 text-sm text-primary hover:underline"
              >
                Ver los {pendientesTotal} pendientes →
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos contactos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {proximos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay próximos contactos programados.
              </p>
            ) : (
              proximos.map((cliente) => (
                <Link
                  key={cliente.id}
                  href={`/clientes/${cliente.id}`}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <span className="font-medium">
                    {cliente.nombre} {cliente.apellidos}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(cliente.fechaProximoContacto!, "dd/MM/yyyy")}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inmuebles disponibles recientes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {inmueblesDisponibles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay inmuebles disponibles ahora mismo.
              </p>
            ) : (
              inmueblesDisponibles.map((inmueble) => (
                <Link
                  key={inmueble.id}
                  href={`/inmuebles/${inmueble.id}`}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{inmueble.referencia}</span>{" "}
                    <span className="text-muted-foreground">
                      — {inmueble.localidad} · {TIPO_INMUEBLE_LABELS[inmueble.tipoInmueble]}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatoPrecio.format(Number(inmueble.precio))}
                  </span>
                </Link>
              ))
            )}
            <Link
              href="/inmuebles?estado=DISPONIBLE"
              className="mt-1 text-sm text-primary hover:underline"
            >
              Ver todos los disponibles →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operaciones recientes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {operacionesRecientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no se ha cerrado ninguna operación.
              </p>
            ) : (
              operacionesRecientes.map((operacion) => (
                <Link
                  key={operacion.id}
                  href={`/inmuebles/${operacion.inmuebleId}`}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{operacion.inmueble.referencia}</span>{" "}
                    <span className="text-muted-foreground">
                      — {operacion.cliente.nombre} {operacion.cliente.apellidos} ·{" "}
                      {TIPO_OPERACION_LABELS[operacion.tipoOperacion]}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {format(operacion.fecha, "dd/MM/yyyy")}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
