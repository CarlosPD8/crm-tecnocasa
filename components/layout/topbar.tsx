import { Button } from "@/components/ui/button";

export function Topbar({ userEmail }: { userEmail: string | undefined }) {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <span className="text-sm text-muted-foreground">{userEmail}</span>
      <form action="/auth/logout" method="post">
        <Button type="submit" variant="outline" size="sm">
          Cerrar sesión
        </Button>
      </form>
    </header>
  );
}
