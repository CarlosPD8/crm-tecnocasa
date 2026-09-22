import { Topbar } from "@/components/layout/topbar";
import { createClient } from "@/lib/supabase/server";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-soft"
      >
        Saltar al contenido
      </a>
      <Topbar userEmail={user?.email} />
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
