import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { getSesionPerfil } from "@/lib/db";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";

export default async function SinAccesoPage() {
  const sesion = await getSesionPerfil();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;
  // Access was restored: the panel decides where to go from here.
  if (usuario?.activo && usuario.oficina.activa) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6 py-12">
      <Brand size="lg" />
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <span className="grid size-11 place-items-center rounded-full bg-secondary text-muted-foreground">
          <LockKeyhole className="size-5" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl leading-tight">Tu cuenta no tiene acceso</h1>
          <p className="text-sm text-muted-foreground">
            {sesion.email ? `${sesion.email} no está activa` : "Esta cuenta no está activa"} en ninguna oficina.
            Si crees que es un error, pide al director de tu oficina que revise tu acceso.
          </p>
        </div>
        <form action="/auth/logout" method="post">
          <Button type="submit" variant="outline" size="lg">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </main>
  );
}
