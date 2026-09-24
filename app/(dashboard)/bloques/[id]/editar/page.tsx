import { notFound } from "next/navigation";
import { getContexto } from "@/lib/db";
import { formatBloque } from "@/lib/validations/bloque";
import { BloqueForm } from "@/components/bloques/bloque-form";
import { PageHeader } from "@/components/shared/page-header";

export default async function EditarBloquePage({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await getContexto();
  const { id } = await params;
  const bloque = await db.bloque.findUnique({ where: { id } });
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
