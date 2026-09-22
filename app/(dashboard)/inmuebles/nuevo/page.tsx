import { prisma } from "@/lib/prisma";
import { InmuebleForm } from "@/components/inmuebles/inmueble-form";
import { PageHeader } from "@/components/shared/page-header";
import { formatBloque } from "@/lib/validations/bloque";

export default async function NuevoInmueblePage({
  searchParams,
}: {
  searchParams: Promise<{ bloque?: string }>;
}) {
  const { bloque: bloqueId } = await searchParams;
  const bloque = bloqueId
    ? await prisma.bloque.findUnique({
        where: { id: bloqueId },
        select: { id: true, calle: true, numero: true, localidad: true },
      })
    : null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={
          bloque
            ? { href: `/bloques/${bloque.id}`, label: formatBloque(bloque) }
            : { href: "/inmuebles", label: "Inmuebles" }
        }
        eyebrow="Alta"
        title="Nuevo inmueble"
        description={
          bloque
            ? `Se añadirá al bloque ${formatBloque(bloque)}. Podrás añadir fotos y documentos desde la ficha una vez guardado.`
            : "Podrás añadir fotos y documentos desde la ficha una vez guardado."
        }
      />
      <InmuebleForm bloqueInicial={bloque} />
    </div>
  );
}
