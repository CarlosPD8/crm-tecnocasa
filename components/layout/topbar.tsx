import Link from "next/link";
import { Brand } from "@/components/layout/brand";
import { MainNav } from "@/components/layout/main-nav";
import { UserMenu, type UsuarioMenu } from "@/components/layout/user-menu";
import { ThemeMenu } from "@/components/layout/theme-menu";

export function Topbar({ usuario, esDirector }: { usuario: UsuarioMenu; esDirector: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <Brand />
          </Link>
          <MainNav esDirector={esDirector} className="hidden md:flex" />
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeMenu />
          <UserMenu usuario={usuario} />
        </div>
      </div>
      <div className="border-t border-border/70 px-2 py-1.5 md:hidden">
        <MainNav esDirector={esDirector} className="overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden" />
      </div>
    </header>
  );
}
