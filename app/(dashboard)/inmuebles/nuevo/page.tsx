import { getContexto, opcionesAsesor, zonasVisibles } from "@/lib/db";
import { InmuebleForm } from "@/components/inmuebles/inmueble-form";
import { PageHeader } from "@/components/shared/page-header";
import { formatBloque } from "@/lib/validations/bloque";

export default async function NuevoInmueblePage({
  searchParams,
}: {
  searchParams: Promise<{ bloque?: string; propietario?: string }>;
}) {
  const ctx = await getContexto();
  const { db, esDirector, usuario } = ctx;
  const { bloque: bloqueId, propietario: propietarioId } = await searchParams;
  const [bloque, propietario, asesores, zonas] = await Promise.all([
    bloqueId
      ? db.bloque.findUnique({
          where: { id: bloqueId },
          select: {
            id: true,
            calle: true,
            numero: true,
            localidad: true,
            zona: { select: { id: true, nombre: true, color: true } },
          },
        })
      : null,
    // «Añadir inmueble» from a client's page: start with them as owner.
    propietarioId
      ? db.cliente.findUnique({
          where: { id: propietarioId },
          select: { id: true, nombre: true, apellidos: true },
        })
      : null,
    esDirector ? opcionesAsesor(db) : undefined,
    zonasVisibles(ctx),
  ]);

  const back = bloque
    ? { href: `/bloques/${bloque.id}`, label: formatBloque(bloque) }
    : propietario
      ? { href: `/clientes/${propietario.id}`, label: `${propietario.nombre} ${propietario.apellidos}` }
      : { href: "/inmuebles", label: "Inmuebles" };

  const destino = [
    bloque && `al bloque ${formatBloque(bloque)}`,
    propietario && `a la cartera de ${propietario.nombre} ${propietario.apellidos}`,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={back}
        eyebrow="Alta"
        title="Nuevo inmueble"
        description={`${destino.length ? `Se añadirá ${destino.join(" y ")}. ` : ""}Podrás añadir fotos y documentos desde la ficha una vez guardado.`}
      />
      <InmuebleForm
        bloqueInicial={bloque}
        propietarioInicial={propietario ? { id: propietario.id, label: `${propietario.nombre} ${propietario.apellidos}` } : null}
        asesores={asesores}
        asesorInicial={usuario.id}
        zonas={zonas}
        esDirector={esDirector}
      />
    </div>
  );
}
