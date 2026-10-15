import { notFound } from "next/navigation";
import { getContexto, opcionesAsesor, zonasVisibles } from "@/lib/db";
import { InmuebleForm } from "@/components/inmuebles/inmueble-form";
import { PageHeader } from "@/components/shared/page-header";

export default async function EditarInmueblePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getContexto();
  const { db, esDirector } = ctx;
  const { id } = await params;
  const [inmueble, asesores, zonas] = await Promise.all([
    db.inmueble.findUnique({
      where: { id },
      include: {
        propietario: true,
        // Null for an advisor when the block is in a zone they don't work.
        bloque: {
          select: {
            id: true,
            calle: true,
            numero: true,
            localidad: true,
            zona: { select: { id: true, nombre: true, color: true } },
          },
        },
        zona: { select: { nombre: true, color: true } },
      },
    }),
    esDirector ? opcionesAsesor(db) : undefined,
    zonasVisibles(ctx),
  ]);

  if (!inmueble) notFound();
  const { propietario, bloque, zona, ...datos } = inmueble;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: `/inmuebles/${inmueble.id}`, label: "Volver a la ficha" }}
        eyebrow={<span className="font-mono tracking-normal normal-case">{inmueble.referencia}</span>}
        title={inmueble.direccion}
      />
      <InmuebleForm
        inmueble={{ ...datos, precio: datos.precio.toString() }}
        propietarioInicial={
          propietario
            ? { id: propietario.id, label: `${propietario.nombre} ${propietario.apellidos}` }
            : null
        }
        bloqueInicial={bloque}
        asesores={asesores}
        zonas={zonas}
        zonaActual={zona}
        bloqueAjeno={Boolean(datos.bloqueId && !bloque)}
        esDirector={esDirector}
      />
    </div>
  );
}
