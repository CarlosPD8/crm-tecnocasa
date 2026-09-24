import { redirect } from "next/navigation";

import { getSesionPerfil } from "@/lib/db";
import { Brand } from "@/components/layout/brand";
import { ThemeMenu } from "@/components/layout/theme-menu";
import { PasswordForm } from "@/components/cuenta/password-form";

export default async function CambiarContrasenaPage() {
  const sesion = await getSesionPerfil();
  if (!sesion) redirect("/login");
  const { usuario } = sesion;
  if (!usuario || !usuario.activo || !usuario.oficina.activa) redirect("/sin-acceso");
  if (!usuario.debeCambiarPassword) redirect("/");

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-10 px-6 py-12">
      <ThemeMenu className="absolute top-5 right-5" />
      <Brand size="lg" />
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Primer acceso · Oficina {usuario.oficina.nombre}</p>
          <h1 className="font-display text-4xl leading-tight">Crea tu contraseña</h1>
          <p className="text-sm text-muted-foreground">
            Hola, {usuario.nombre}. Has entrado con una contraseña temporal: elige una propia para seguir.
            Solo la sabrás tú.
          </p>
        </div>
        <PasswordForm modo="inicial" />
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
