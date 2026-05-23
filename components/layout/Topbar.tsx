"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { PlatformSelector } from "./PlatformSelector";

interface TopbarProps {
  userName: string;
  userEmail: string;
  agencia: string;
}

export function Topbar({ userName, userEmail, agencia }: TopbarProps) {
  const initial = userName.charAt(0).toUpperCase() || "U";
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <header className="mk-topbar">
      <div className="topbar-left">
        <div className="search-wrap">
          <i className="ti ti-search" />
          <input
            className="search-input"
            placeholder="Buscar campanha, criativo, cliente..."
          />
        </div>
      </div>
      <div className="topbar-right">
        <PlatformSelector />
        <DropdownMenu>
          <DropdownMenuTrigger
            className="avatar-r"
            title={userName}
            aria-label="Menu do usuário"
          >
            {initial}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="font-medium">{userName}</div>
                <div className="text-xs font-normal" style={{ color: "var(--mk-text-muted)" }}>
                  {userEmail}
                </div>
                <div className="text-xs font-normal mt-1" style={{ color: "var(--mk-text-muted)" }}>
                  {agencia}
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={pending}
              onClick={handleSignOut}
              className="cursor-pointer"
            >
              <i className="ti ti-logout mr-2" style={{ fontSize: 14 }} />
              {pending ? "Saindo..." : "Sair"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
