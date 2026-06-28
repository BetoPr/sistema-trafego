"use client";

import { useCollapse } from "@/components/providers/CollapseProvider";
import { PlatformSelector } from "./PlatformSelector";
import { ProfileMenu, type LicencaStatus } from "./ProfileMenu";

interface TopbarProps {
  userName: string;
  userEmail: string;
  agencia: string;
  avatarUrl?: string | null;
  role: string;
  versao: string;
  licenca: LicencaStatus;
  trialAcabaEm?: string | null;
  vencimentoEm?: string | null;
  onlineInicial: boolean;
}

export function Topbar({
  userName, userEmail, avatarUrl,
  role, versao, licenca, trialAcabaEm, vencimentoEm, onlineInicial,
}: TopbarProps) {
  const { openMobile } = useCollapse();

  return (
    <header className="mk-topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="mk-hamburger"
          onClick={openMobile}
          title="Abrir menu"
          aria-label="Abrir menu"
        >
          <i className="ti ti-menu-2" style={{ fontSize: 18 }} />
        </button>
        <button
          type="button"
          className="topbar-search"
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          title="Buscar (Cmd+K)"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: 320,
            height: 36,
            padding: "0 12px",
            background: "var(--mk-surface)",
            border: "0.5px solid var(--mk-border)",
            borderRadius: 22,
            color: "var(--mk-text-muted)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 12.5,
            textAlign: "left",
          }}
        >
          <i className="ti ti-search" style={{ fontSize: 14 }} />
          <span style={{ flex: 1 }}>Buscar páginas, sessões...</span>
        </button>
      </div>
      <div className="topbar-right">
        <PlatformSelector />
        <ProfileMenu
          userName={userName}
          userEmail={userEmail}
          role={role}
          avatarUrl={avatarUrl}
          versao={versao}
          licenca={licenca}
          trialAcabaEm={trialAcabaEm}
          vencimentoEm={vencimentoEm}
          onlineInicial={onlineInicial}
        />
      </div>
    </header>
  );
}
