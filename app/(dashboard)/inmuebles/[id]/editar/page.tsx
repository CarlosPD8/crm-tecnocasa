import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InmuebleForm } from "@/components/inmuebles/inmueble-form";

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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Editar inmueble: {inmueble.referencia}</h1>
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
