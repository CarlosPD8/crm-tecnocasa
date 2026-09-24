"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type UsuarioMenu = { nombre: string; email: string; oficina: string };

export function UserMenu({ usuario }: { usuario: UsuarioMenu }) {
  const inicial = (usuario.nombre[0] ?? usuario.email[0] ?? "?").toUpperCase();

  return (
    <>
      <form id="logout-form" action="/auth/logout" method="post" hidden />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Menú de usuario"
          className="grid size-8 place-items-center rounded-[30%] bg-secondary text-sm font-semibold text-secondary-foreground ring-1 ring-foreground/5 transition-[transform,background-color] duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-95"
        >
          {inicial}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
              <span className="truncate text-sm font-medium text-foreground">{usuario.nombre}</span>
              <span className="truncate text-xs text-muted-foreground">{usuario.email}</span>
              <span className="truncate text-xs text-muted-foreground">Oficina {usuario.oficina}</span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/cuenta" />}>
            <UserRound />
            Mi cuenta
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            nativeButton
            render={<button type="submit" form="logout-form" className="w-full" />}
          >
            <LogOut />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
