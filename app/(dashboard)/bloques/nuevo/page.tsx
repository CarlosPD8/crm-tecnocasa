import { getContexto, zonasVisibles } from "@/lib/db";
import { BloqueForm } from "@/components/bloques/bloque-form";
import { PageHeader } from "@/components/shared/page-header";

export default async function NuevoBloquePage() {
  const ctx = await getContexto();
  const zonas = await zonasVisibles(ctx);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/bloques", label: "Bloques" }}
        eyebrow="Alta"
        title="Nuevo bloque"
        description="Después podrás añadir sus pisos desde la ficha del bloque."
      />
      <BloqueForm zonas={zonas} esDirector={ctx.esDirector} />
    </div>
  );
}
