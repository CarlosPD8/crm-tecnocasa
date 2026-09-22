import Link from "next/link";
import { Brand } from "@/components/layout/brand";
import { MainNav } from "@/components/layout/main-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeMenu } from "@/components/layout/theme-menu";

export function Topbar({ userEmail }: { userEmail: string | undefined }) {
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
          <MainNav className="hidden md:flex" />
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeMenu />
          <UserMenu userEmail={userEmail} />
        </div>
      </div>
      <div className="border-t border-border/70 px-2 py-1.5 md:hidden">
        <MainNav className="overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden" />
      </div>
    </header>
  );
}
