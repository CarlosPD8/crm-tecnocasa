import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InmuebleForm } from "@/components/inmuebles/inmueble-form";
import { PageHeader } from "@/components/shared/page-header";

export default async function EditarInmueblePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inmueble = await prisma.inmueble.findUnique({
    where: { id },
    include: {
      propietario: true,
      bloque: { select: { id: true, calle: true, numero: true, localidad: true } },
    },
  });

  if (!inmueble) notFound();
  const { propietario, bloque, ...datos } = inmueble;

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
      />
    </div>
  );
}
