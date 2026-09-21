import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { PageHeader } from "@/components/shared/page-header";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({ where: { id } });

  if (!cliente) notFound();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: `/clientes/${cliente.id}`, label: "Volver a la ficha" }}
        eyebrow="Editar cliente"
        title={`${cliente.nombre} ${cliente.apellidos}`}
      />
      <ClienteForm cliente={cliente} />
    </div>
  );
}
