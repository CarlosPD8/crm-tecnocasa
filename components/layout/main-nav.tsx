"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Panel" },
  { href: "/clientes", label: "Clientes" },
  { href: "/inmuebles", label: "Inmuebles" },
  { href: "/bloques", label: "Bloques" },
];

export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Principal" className={cn("flex items-center gap-1", className)}>
      {links.map(({ href, label }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
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
