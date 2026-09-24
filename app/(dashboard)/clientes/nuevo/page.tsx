import { getContexto, opcionesAsesor } from "@/lib/db";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { PageHeader } from "@/components/shared/page-header";

export default async function NuevoClientePage() {
  const { db, esDirector, usuario } = await getContexto();
  const asesores = esDirector ? await opcionesAsesor(db) : undefined;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/clientes", label: "Clientes" }}
        eyebrow="Alta"
        title="Nuevo cliente"
        description="Programa una fecha de próximo contacto para que aparezca en el panel cuando toque llamar."
      />
      <ClienteForm asesores={asesores} asesorInicial={usuario.id} />
    </div>
  );
}
