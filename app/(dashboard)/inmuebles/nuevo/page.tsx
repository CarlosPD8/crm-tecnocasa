import { InmuebleForm } from "@/components/inmuebles/inmueble-form";

export default function NuevoInmueblePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nuevo inmueble</h1>
      <InmuebleForm />
    </div>
  );
}
