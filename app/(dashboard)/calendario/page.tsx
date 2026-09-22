import { PageHeader } from "@/components/shared/page-header";
import { CalendarioVista } from "@/components/calendario/calendario-vista";

export default function CalendarioPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Agenda"
        title="Calendario"
        description="Tus citas junto a los próximos contactos, los contactos hechos y las operaciones. Selecciona un hueco para crear un evento y arrástralo o estíralo para cambiarlo."
      />
      <CalendarioVista />
    </div>
  );
}
