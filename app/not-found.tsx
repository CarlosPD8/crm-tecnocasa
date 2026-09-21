import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="font-display text-5xl leading-tight sm:text-6xl">
        Esta dirección <em>no está en cartera</em>
      </h1>
      <p className="max-w-[46ch] text-sm text-muted-foreground">
        La página que buscas no existe o el registro se ha eliminado.
      </p>
      <Button size="lg" nativeButton={false} render={<Link href="/">Volver al panel</Link>} />
    </main>
  );
}
