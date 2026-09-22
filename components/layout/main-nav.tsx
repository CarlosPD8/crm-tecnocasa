"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Panel" },
  { href: "/clientes", label: "Clientes" },
  { href: "/inmuebles", label: "Inmuebles" },
  { href: "/bloques", label: "Bloques" },
  { href: "/calendario", label: "Calendario" },
];

export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // On phones the nav scrolls sideways: keep the current section in view.
  useEffect(() => {
    const nav = navRef.current;
    const activo = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !activo || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({ left: activo.offsetLeft - (nav.clientWidth - activo.offsetWidth) / 2 });
  }, [pathname]);

  return (
    <nav ref={navRef} aria-label="Principal" className={cn("flex items-center gap-1", className)}>
      {links.map(({ href, label }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
              isActive &&
                "bg-card text-foreground shadow-soft ring-1 ring-foreground/5 hover:bg-card"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
