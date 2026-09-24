import { requireDirector } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { EquipoTable, type MiembroEquipo } from "@/components/equipo/equipo-table";
import { NuevoUsuarioButton } from "@/components/equipo/usuario-dialog";

export default async function EquipoPage() {
  const { db, usuario, oficina } = await requireDirector();

  const [usuarios, clientes, inmuebles] = await Promise.all([
    db.usuario.findMany({
      orderBy: [{ activo: "desc" }, { rol: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, email: true, rol: true, activo: true, debeCambiarPassword: true },
    }),
    db.cliente.groupBy({ by: ["asesorId"], _count: { _all: true } }),
    db.inmueble.groupBy({ by: ["asesorId"], _count: { _all: true } }),
  ]);

  const porAsesor = (filas: { asesorId: string | null; _count: { _all: number } }[]) =>
    new Map(filas.map((f) => [f.asesorId, f._count._all]));
  const numClientes = porAsesor(clientes);
  const numInmuebles = porAsesor(inmuebles);

  const miembros: MiembroEquipo[] = usuarios.map((u) => ({
    ...u,
    esYo: u.id === usuario.id,
    clientes: numClientes.get(u.id) ?? 0,
    inmuebles: numInmuebles.get(u.id) ?? 0,
  }));
  const activos = miembros.filter((m) => m.activo).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={`Oficina ${oficina.nombre}`}
        title="Equipo"
        description={`${activos} ${activos === 1 ? "persona activa" : "personas activas"}. Todos ven y trabajan los mismos datos de la oficina; solo los directores gestionan el equipo, borran, reasignan y exportan.`}
        actions={<NuevoUsuarioButton />}
      />
      <EquipoTable miembros={miembros} />
    </div>
  );
}
