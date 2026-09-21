import { InmuebleForm } from "@/components/inmuebles/inmueble-form";
import { PageHeader } from "@/components/shared/page-header";

export default function NuevoInmueblePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/inmuebles", label: "Inmuebles" }}
        eyebrow="Alta"
        title="Nuevo inmueble"
        description="Podrás añadir fotos y documentos desde la ficha una vez guardado."
      />
      <InmuebleForm />
    </div>
  );
}
