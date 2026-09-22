import { BloqueForm } from "@/components/bloques/bloque-form";
import { PageHeader } from "@/components/shared/page-header";

export default function NuevoBloquePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/bloques", label: "Bloques" }}
        eyebrow="Alta"
        title="Nuevo bloque"
        description="Después podrás añadir sus pisos desde la ficha del bloque."
      />
      <BloqueForm />
    </div>
  );
}
