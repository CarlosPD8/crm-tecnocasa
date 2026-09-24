import { notFound } from "next/navigation";
import { getContexto, opcionesAsesor } from "@/lib/db";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { PageHeader } from "@/components/shared/page-header";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db, esDirector } = await getContexto();
  const { id } = await params;
  const [cliente, asesores] = await Promise.all([
    db.cliente.findUnique({ where: { id } }),
    esDirector ? opcionesAsesor(db) : undefined,
  ]);

  if (!cliente) notFound();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: `/clientes/${cliente.id}`, label: "Volver a la ficha" }}
        eyebrow="Editar cliente"
        title={`${cliente.nombre} ${cliente.apellidos}`}
      />
      <ClienteForm cliente={cliente} asesores={asesores} />
    </div>
  );
}
