"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

export type LicencaStatus = "ativa" | "trial" | "bloqueada" | "atrasada";

interface ProfileMenuProps {
  userName: string;
  userEmail: string;
  role: string;
  avatarUrl?: string | null;
  versao: string;
  licenca: LicencaStatus;
  trialAcabaEm?: string | null;
  vencimentoEm?: string | null;
  onlineInicial: boolean;
}

const LICENCA_INFO: Record<LicencaStatus, { label: string; cor: string; bg: string }> = {
  ativa:      { label: "Ativa",     cor: "#00E19A", bg: "rgba(0,225,154,0.12)" },
  trial:      { label: "Trial",     cor: "#5cd0ff", bg: "rgba(92,208,255,0.12)" },
  bloqueada:  { label: "Bloqueada", cor: "#FF5C72", bg: "rgba(255,92,114,0.12)" },
  atrasada:   { label: "Atrasada",  cor: "#FFB547", bg: "rgba(255,181,71,0.12)" },
};

function formatarDataCurta(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return null;
  }
}

export function ProfileMenu({
  userName,
  userEmail,
  role,
  avatarUrl,
  versao,
  licenca,
  trialAcabaEm,
  vencimentoEm,
  onlineInicial,
}: ProfileMenuProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [online, setOnline] = useState(onlineInicial);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [limpandoCookies, setLimpandoCookies] = useState(false);

  const initial = userName.charAt(0).toUpperCase() || "U";
  const lic = LICENCA_INFO[licenca];

  async function toggleOnline() {
    if (togglingOnline) return;
    const novo = !online;
    setOnline(novo);
    setTogglingOnline(true);
    try {
      await fetch("/api/usuarios/online-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ online: novo }),
      });
    } catch {
      setOnline(!novo); // revert
    } finally {
      setTogglingOnline(false);
    }
  }

  async function limparCookies() {
    if (limpandoCookies) return;
    if (!confirm("Limpar cookies e cache do navegador? Você precisará fazer login novamente.")) return;
    setLimpandoCookies(true);
    try {
      // Limpa localStorage + sessionStorage
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
      // Limpa cookies do domínio atual
      document.cookie.split(";").forEach((c) => {
        const name = c.split("=")[0]?.trim();
        if (name) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        }
      });
      // Faz signOut do Supabase pra invalidar refresh token
      const sb = createClient();
      await sb.auth.signOut().catch(() => {});
      window.location.href = "/login";
    } finally {
      setLimpandoCookies(false);
    }
  }

  function handleSignOut() {
    startTransition(async () => {
      const sb = createClient();
      await sb.auth.signOut();
      router.replace("/login");
      router.refresh();
    });
  }

  const dataLimite = formatarDataCurta(licenca === "trial" ? trialAcabaEm : vencimentoEm);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="avatar-r" title={userName} aria-label="Menu do usuário">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
        ) : initial}
        <span
          aria-hidden
          style={{
            position: "absolute", bottom: 0, right: 0,
            width: 10, height: 10, borderRadius: "50%",
            background: online ? "#00E19A" : "#6B7A75",
            border: "2px solid var(--mk-bg)",
          }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="profile-menu" style={{ width: 280, padding: 0 }}>
        {/* Header */}
        <div style={{ padding: "14px 16px 12px" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--mk-text)", lineHeight: 1.2 }}>{userName}</div>
          <div style={{ fontSize: 12, color: "var(--mk-text-muted)", marginTop: 2 }}>{userEmail}</div>
          <span style={{
            display: "inline-block", marginTop: 8,
            fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
            padding: "3px 10px", borderRadius: 999,
            background: "rgba(0,225,154,0.12)", color: "#00E19A",
            border: "1px solid rgba(0,225,154,0.25)",
          }}>{role}</span>
        </div>

        <div style={{ borderTop: "1px solid var(--mk-border)" }} />

        {/* Versão */}
        <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--mk-text-muted)" }}>
          <span><i className="ti ti-tag" style={{ marginRight: 6 }} />Versão</span>
          <strong style={{ color: "var(--mk-text)", fontWeight: 600 }}>{versao}</strong>
        </div>

        {/* Licença */}
        <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--mk-text-muted)" }}>
          <span><i className="ti ti-shield-check" style={{ marginRight: 6, color: lic.cor }} />Licença</span>
          <span style={{
            fontSize: 11, fontWeight: 700,
            padding: "3px 10px", borderRadius: 999,
            background: lic.bg, color: lic.cor,
            border: `1px solid ${lic.cor}33`,
          }}>
            {lic.label}{dataLimite ? ` · ${dataLimite}` : ""}
          </span>
        </div>

        <div style={{ borderTop: "1px solid var(--mk-border)" }} />

        {/* Status online */}
        <button
          onClick={toggleOnline}
          disabled={togglingOnline}
          style={{
            width: "100%", padding: "12px 16px",
            display: "flex", alignItems: "flex-start", gap: 12,
            background: "transparent", border: 0, cursor: "pointer",
            textAlign: "left", color: "inherit", fontFamily: "inherit",
          }}
        >
          <span style={{
            width: 12, height: 12, borderRadius: "50%",
            background: online ? "#00E19A" : "#6B7A75",
            boxShadow: online ? "0 0 8px rgba(0,225,154,0.6)" : "none",
            marginTop: 3, flexShrink: 0,
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mk-text)", lineHeight: 1.2 }}>
              {online ? "Online" : "Offline"}
            </div>
            <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 3, lineHeight: 1.4 }}>
              {online
                ? "Equipe vê você como disponível. Recebe novas conversas automaticamente."
                : "Ficar offline impede receber novas conversas automaticamente. Conversas atuais continuam abertas."}
            </div>
          </div>
        </button>

        <div style={{ borderTop: "1px solid var(--mk-border)" }} />

        {/* Meu Perfil */}
        <button
          onClick={() => router.push("/conta")}
          style={{
            width: "100%", padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 12,
            background: "transparent", border: 0, cursor: "pointer",
            textAlign: "left", color: "var(--mk-text)", fontFamily: "inherit",
            fontSize: 13,
          }}
        >
          <i className="ti ti-user-circle" style={{ fontSize: 17, color: "var(--mk-text-muted)" }} />
          Meu Perfil
        </button>

        {/* Limpar cookies */}
        <button
          onClick={limparCookies}
          disabled={limpandoCookies}
          style={{
            width: "100%", padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 12,
            background: "transparent", border: 0, cursor: "pointer",
            textAlign: "left", color: "var(--mk-text)", fontFamily: "inherit",
            fontSize: 13,
          }}
        >
          <i className="ti ti-cookie-off" style={{ fontSize: 17, color: "var(--mk-text-muted)" }} />
          {limpandoCookies ? "Limpando..." : "Limpar cookies"}
        </button>

        <div style={{ borderTop: "1px solid var(--mk-border)" }} />

        {/* Sair */}
        <button
          onClick={handleSignOut}
          disabled={pending}
          style={{
            width: "100%", padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 12,
            background: "transparent", border: 0, cursor: "pointer",
            textAlign: "left", color: "#FF5C72", fontFamily: "inherit",
            fontSize: 13, fontWeight: 600,
          }}
        >
          <i className="ti ti-logout" style={{ fontSize: 17 }} />
          {pending ? "Saindo..." : "Sair"}
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
