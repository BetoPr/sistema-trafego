"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/actions/auth";

interface TopbarProps {
  userName: string;
  userEmail: string;
  agencia: string;
}

export function Topbar({ userName, userEmail, agencia }: TopbarProps) {
  const initial = userName.charAt(0).toUpperCase() || "U";

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
        <div className="date-pill">
          <i className="ti ti-calendar" style={{ fontSize: 14 }} />
          Últimos 30 dias
          <i className="ti ti-chevron-down" style={{ fontSize: 14 }} />
        </div>
        <button type="button" className="cta-btn">
          <i className="ti ti-plus" style={{ fontSize: 14 }} />
          Nova campanha
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="avatar-r"
            title={userName}
            aria-label="Menu do usuário"
          >
            {initial}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{userName}</div>
              <div className="text-xs font-normal" style={{ color: "var(--mk-text-muted)" }}>
                {userEmail}
              </div>
              <div className="text-xs font-normal mt-1" style={{ color: "var(--mk-text-muted)" }}>
                {agencia}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={signOutAction}>
              <DropdownMenuItem
                render={(props) => (
                  <button
                    {...props}
                    type="submit"
                    className={`${props.className ?? ""} w-full cursor-pointer`}
                  />
                )}
              >
                <i className="ti ti-logout mr-2" style={{ fontSize: 14 }} />
                Sair
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
