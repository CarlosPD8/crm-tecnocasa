"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Menu, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const links = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/inmuebles", label: "Inmuebles", icon: Building2 },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon" aria-label="Abrir menú" className="md:hidden">
            <Menu />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-48">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <DropdownMenuItem
              key={href}
              render={
                <Link
                  href={href}
                  className={cn(isActive && "bg-primary/10 text-primary")}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              }
            />
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
