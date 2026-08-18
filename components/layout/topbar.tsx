import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/mobile-nav";

export function Topbar({ userEmail }: { userEmail: string | undefined }) {
  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b px-4">
      <div className="flex items-center gap-3">
        <MobileNav />
        <span className="flex items-center gap-2 md:hidden">
          <span className="flex size-6 items-center justify-center rounded bg-primary text-xs font-black text-primary-foreground">
            T
          </span>
          <span className="text-sm font-black tracking-tight">tecnocasa</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {userEmail}
        </span>
        <form action="/auth/logout" method="post">
          <Button type="submit" variant="outline" size="sm">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </header>
  );
}
