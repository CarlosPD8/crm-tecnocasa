"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/inmuebles", label: "Inmuebles", icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r bg-sidebar p-4 md:block">
      <div className="mb-6 flex items-center gap-2 px-2">
        <span className="flex size-7 items-center justify-center rounded bg-primary text-sm font-black text-primary-foreground">
          T
        </span>
        <span className="text-lg font-black tracking-tight text-foreground">
          tecnocasa
        </span>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md border-l-2 border-transparent px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                isActive &&
                  "border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
