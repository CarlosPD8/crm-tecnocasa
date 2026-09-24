import { Topbar } from "@/components/layout/topbar";
import { getContexto } from "@/lib/db";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Signs out, locks out or sends to the password change whoever can't be here.
  const { usuario, oficina, esDirector } = await getContexto();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-soft"
      >
        Saltar al contenido
      </a>
      <Topbar
        usuario={{ nombre: usuario.nombre, email: usuario.email, oficina: oficina.nombre }}
        esDirector={esDirector}
      />
      <main
        id="contenido"
        className="mx-auto w-full max-w-7xl flex-1 px-4 pt-8 pb-16 sm:px-6 lg:px-8 lg:pt-10"
      >
        {children}
      </main>
      <Toaster />
    </div>
  );
}
