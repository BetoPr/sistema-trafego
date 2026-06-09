"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PaletteItem {
  href: string;
  label: string;
  icon: string;
  categoria: string;
  categoriaCor: string;
}

interface Props {
  role?: string;
}

function buildItems(role?: string): PaletteItem[] {
  const list: PaletteItem[] = [];
  const push = (categoria: string, cor: string, items: Array<{ href: string; label: string; icon: string }>) => {
    for (const it of items) list.push({ ...it, categoria, categoriaCor: cor });
  };

  push("Principal", "#6B8E4E", [{ href: "/dashboard", label: "Dashboard", icon: "ti-home" }]);
  push("Atendimento", "#9B7DBF", [
    { href: "/atendimentos", label: "Atendimentos", icon: "ti-messages" },
    { href: "/contatos", label: "Contatos", icon: "ti-address-book" },
  ]);
  push("Comunicação", "#5B8BA6", [
    { href: "/envio-massa", label: "Envio em Massa", icon: "ti-rocket" },
    { href: "/mensagens-rapidas", label: "Mensagens Rápidas", icon: "ti-bolt" },
    { href: "/galeria", label: "Galeria", icon: "ti-photo" },
    { href: "/grupos", label: "Grupos", icon: "ti-users-group" },
  ]);
  push("Tráfego (Ads)", "#9B7DBF", [
    { href: "/campanhas", label: "Campanhas", icon: "ti-speakerphone" },
    { href: "/funil", label: "Funil", icon: "ti-filter" },
    { href: "/criativos", label: "Criativos", icon: "ti-photo-square-rounded" },
    { href: "/publico", label: "Público", icon: "ti-users-group" },
    { href: "/relatorios", label: "Relatórios", icon: "ti-file-analytics" },
    { href: "/ia-insights", label: "Insights IA", icon: "ti-brain" },
    { href: "/alertas", label: "Alertas", icon: "ti-bell-ringing" },
  ]);
  push("Administração", "#C9A876", [
    { href: "/canais", label: "Canais", icon: "ti-brand-whatsapp" },
    { href: "/filas", label: "Filas", icon: "ti-list-tree" },
    { href: "/equipes", label: "Equipes", icon: "ti-users-group" },
    { href: "/usuarios", label: "Usuários", icon: "ti-user-circle" },
    { href: "/clientes", label: "Clientes (Ads)", icon: "ti-briefcase" },
  ]);
  push("Configuração", "#5B8BA6", [
    { href: "/configuracoes", label: "Configurações", icon: "ti-adjustments" },
    { href: "/configuracoes/ia", label: "Chaves IA (Groq)", icon: "ti-key" },
    { href: "/configuracoes/ia-prompts", label: "Prompts IA", icon: "ti-sparkles" },
    { href: "/configuracoes/asaas", label: "Asaas", icon: "ti-credit-card" },
    { href: "/configuracoes/webhooks", label: "Webhooks", icon: "ti-webhook" },
    { href: "/integracoes", label: "Integrações", icon: "ti-plug" },
    { href: "/auditoria", label: "Log de Auditoria", icon: "ti-file-text" },
  ]);
  if (role === "super_admin") {
    push("Super Admin", "#C97064", [
      { href: "/super-admin/servidores", label: "Servidores UAZAPI", icon: "ti-server" },
      { href: "/super-admin/instancias", label: "Instâncias", icon: "ti-brand-whatsapp" },
    ]);
  }
  push("Conta", "#6B8E4E", [
    { href: "/conta", label: "Meu Perfil", icon: "ti-user-circle" },
    { href: "/plano", label: "Plano Pro", icon: "ti-credit-card" },
  ]);

  return list;
}

export function CommandPalette({ role }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const items = buildItems(role);

  // Cmd+K / Ctrl+K abre
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQ("");
      setFocusIdx(0);
    }
  }, [open]);

  const filtered = q
    ? items.filter((i) => `${i.label} ${i.categoria}`.toLowerCase().includes(q.toLowerCase()))
    : items;

  // Agrupa por categoria preservando ordem
  const grupos: Array<{ categoria: string; cor: string; items: PaletteItem[] }> = [];
  for (const it of filtered) {
    let g = grupos.find((g) => g.categoria === it.categoria);
    if (!g) {
      g = { categoria: it.categoria, cor: it.categoriaCor, items: [] };
      grupos.push(g);
    }
    g.items.push(it);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = filtered[focusIdx];
      if (it) {
        setOpen(false);
        router.push(it.href);
      }
    }
  }

  return (
    <>
      {/* Trigger fake (a Topbar passa props daqui pra abrir) */}
      <CommandPaletteTrigger onOpen={() => setOpen(true)} />

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(2px)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            paddingTop: "12vh", zIndex: 1500,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--mk-bg)", border: "0.5px solid var(--mk-border)",
              borderRadius: 12, width: "min(580px, 92vw)", maxHeight: "70vh",
              display: "flex", flexDirection: "column",
              boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
            }}
          >
            {/* Input busca */}
            <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "0.5px solid var(--mk-border)", gap: 10 }}>
              <i className="ti ti-search" style={{ fontSize: 16, color: "var(--mk-text-muted)" }} />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setFocusIdx(0); }}
                onKeyDown={handleKey}
                placeholder="Buscar páginas, sessões..."
                style={{ flex: 1, background: "transparent", border: 0, color: "var(--mk-text)", fontSize: 14, outline: "none" }}
              />
              <button
                onClick={() => setOpen(false)}
                style={{ background: "var(--mk-surface)", border: "0.5px solid var(--mk-border)", borderRadius: "50%", width: 26, height: 26, color: "var(--mk-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <i className="ti ti-x" style={{ fontSize: 13 }} />
              </button>
            </div>

            {/* Lista */}
            <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--mk-text-muted)", padding: 40, fontSize: 12 }}>
                  Nenhuma página encontrada
                </div>
              ) : (
                grupos.map((g) => (
                  <div key={g.categoria} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: g.cor, padding: "8px 12px 4px", letterSpacing: 0.6, textTransform: "uppercase" }}>
                      {g.categoria}
                    </div>
                    {g.items.map((it) => {
                      const flatIdx = filtered.findIndex((x) => x.href === it.href);
                      const isFocus = flatIdx === focusIdx;
                      return (
                        <Link
                          key={it.href}
                          href={it.href}
                          onClick={() => setOpen(false)}
                          onMouseEnter={() => setFocusIdx(flatIdx)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "10px 14px",
                            borderRadius: 8,
                            textDecoration: "none",
                            color: "var(--mk-text)",
                            background: isFocus ? "var(--mk-surface)" : "transparent",
                            fontSize: 13,
                            margin: "0 4px",
                          }}
                        >
                          <i className={`ti ${it.icon}`} style={{ fontSize: 16, color: "var(--mk-text-muted)" }} />
                          {it.label}
                        </Link>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer com hint */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderTop: "0.5px solid var(--mk-border)", fontSize: 10.5, color: "var(--mk-text-muted)" }}>
              <span><kbd style={kbd}>↑↓</kbd> navegar · <kbd style={kbd}>Enter</kbd> abrir · <kbd style={kbd}>Esc</kbd> fechar</span>
              <span>{filtered.length} resultado{filtered.length === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const kbd: React.CSSProperties = {
  display: "inline-block",
  padding: "1px 5px",
  borderRadius: 4,
  border: "0.5px solid var(--mk-border)",
  background: "var(--mk-surface)",
  fontFamily: "monospace",
  fontSize: 9.5,
  color: "var(--mk-text-secondary)",
  marginRight: 2,
};

// =========================================
// Trigger usado pela Topbar
// =========================================

function CommandPaletteTrigger({ onOpen }: { onOpen: () => void }) {
  useEffect(() => {
    function onCustom() { onOpen(); }
    window.addEventListener("open-command-palette", onCustom);
    return () => window.removeEventListener("open-command-palette", onCustom);
  }, [onOpen]);
  return null;
}
