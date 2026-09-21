"use client";

import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ userEmail }: { userEmail: string | undefined }) {
  const inicial = (userEmail?.[0] ?? "?").toUpperCase();

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
              <span className="text-[0.7rem] text-muted-foreground">Sesión iniciada como</span>
              <span className="truncate text-sm font-medium text-foreground">
                {userEmail ?? "Agente"}
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
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
