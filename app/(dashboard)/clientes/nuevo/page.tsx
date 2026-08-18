import { ClienteForm } from "@/components/clientes/cliente-form";

export default function NuevoClientePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nuevo cliente</h1>
      <ClienteForm />
    </div>
  );
}
