import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClienteForm } from "@/components/clientes/cliente-form";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({ where: { id } });

  if (!cliente) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">
        Editar cliente: {cliente.nombre} {cliente.apellidos}
      </h1>
      <ClienteForm cliente={cliente} />
    </div>
  );
}
