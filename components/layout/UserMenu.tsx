"use client";

import { LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  nome: string;
  email: string;
  agencia: string;
}

export function UserMenu({ nome, email, agencia }: UserMenuProps) {
  const initials = nome
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm",
          "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {initials || <User className="h-4 w-4" />}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block font-medium leading-tight">{nome}</span>
          <span className="block text-xs text-muted-foreground">{agencia}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="font-medium">{nome}</div>
          <div className="text-xs text-muted-foreground font-normal">{email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem
            render={(props) => (
              <button {...props} type="submit" className={cn(props.className, "w-full cursor-pointer")} />
            )}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
