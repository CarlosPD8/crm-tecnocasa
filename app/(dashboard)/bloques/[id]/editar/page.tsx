import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBloque } from "@/lib/validations/bloque";
import { BloqueForm } from "@/components/bloques/bloque-form";
import { PageHeader } from "@/components/shared/page-header";

export default async function EditarBloquePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bloque = await prisma.bloque.findUnique({ where: { id } });
  if (!bloque) notFound();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: `/bloques/${bloque.id}`, label: "Volver al bloque" }}
        eyebrow="Editar bloque"
        title={formatBloque(bloque)}
      />
      <BloqueForm bloque={bloque} />
    </div>
  );
}
