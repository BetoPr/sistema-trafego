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
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          className="search-wrap"
          style={{ cursor: "pointer", background: "var(--mk-surface-2)", border: "0.5px solid var(--mk-border)", textAlign: "left" }}
          title="Buscar (Cmd+K)"
        >
          <i className="ti ti-search" />
          <span className="search-input" style={{ background: "transparent", border: 0, color: "var(--mk-text-muted)", flex: 1, padding: 0, fontSize: 13 }}>
            Buscar páginas, sessões...
          </span>
          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--mk-surface)", border: "0.5px solid var(--mk-border)", color: "var(--mk-text-muted)", fontFamily: "monospace" }}>
            ⌘K
          </span>
        </button>
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
