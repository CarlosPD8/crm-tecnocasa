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
    include: { propietario: true },
  });

  if (!inmueble) notFound();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: `/inmuebles/${inmueble.id}`, label: "Volver a la ficha" }}
        eyebrow={<span className="font-mono tracking-normal normal-case">{inmueble.referencia}</span>}
        title={inmueble.direccion}
      />
      <InmuebleForm
        inmueble={{ ...inmueble, precio: inmueble.precio.toString() }}
        propietarioInicial={
          inmueble.propietario
            ? {
                id: inmueble.propietario.id,
                label: `${inmueble.propietario.nombre} ${inmueble.propietario.apellidos}`,
              }
            : null
        }
      />
    </div>
  );
}
