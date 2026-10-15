import { notFound } from "next/navigation";
import { getContexto, zonasVisibles } from "@/lib/db";
import { formatBloque } from "@/lib/validations/bloque";
import { BloqueForm } from "@/components/bloques/bloque-form";
import { PageHeader } from "@/components/shared/page-header";

export default async function EditarBloquePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContexto();
  const { id } = await params;
  const [bloque, zonas] = await Promise.all([
    ctx.db.bloque.findUnique({ where: { id }, include: { zona: { select: { nombre: true, color: true } } } }),
    zonasVisibles(ctx),
  ]);
  if (!bloque) notFound();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: `/bloques/${bloque.id}`, label: "Volver al bloque" }}
        eyebrow="Editar bloque"
        title={formatBloque(bloque)}
      />
      <BloqueForm bloque={bloque} zonas={zonas} esDirector={ctx.esDirector} />
    </div>
  );
}
