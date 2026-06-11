"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useCollapse } from "@/components/providers/CollapseProvider";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: { text: string; variant?: "default" | "amber" | "red" };
  dot?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  icon: string;
  iconColor: string;
  items: NavItem[];
}

function buildSections(role?: string): NavSection[] {
  const list: NavSection[] = [
    {
      id: "principal",
      label: "Principal",
      icon: "ti-layout-grid",
      iconColor: "var(--mk-icon-green)",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: "ti-home" },
      ],
    },
    {
      id: "atendimento",
      label: "Atendimento",
      icon: "ti-message",
      iconColor: "var(--mk-icon-pink)",
      items: [
        { href: "/atendimentos", label: "Atendimentos", icon: "ti-messages" },
        { href: "/contatos", label: "Contatos", icon: "ti-address-book" },
      ],
    },
    {
      id: "comunicacao",
      label: "Comunicação",
      icon: "ti-send",
      iconColor: "var(--mk-icon-blue)",
      items: [
        { href: "/envio-massa", label: "Envio em Massa", icon: "ti-rocket" },
        { href: "/mensagens-rapidas", label: "Mensagens Rápidas", icon: "ti-bolt" },
        { href: "/grupos", label: "Grupos", icon: "ti-users-group" },
      ],
    },
    {
      id: "trafego",
      label: "Tráfego (Ads)",
      icon: "ti-speakerphone",
      iconColor: "var(--mk-icon-purple)",
      items: [
        { href: "/campanhas", label: "Campanhas", icon: "ti-speakerphone", badge: { text: "BREVE", variant: "amber" } },
        { href: "/funil", label: "Funil", icon: "ti-filter", badge: { text: "BREVE", variant: "amber" } },
        { href: "/criativos", label: "Criativos", icon: "ti-photo-square-rounded", badge: { text: "BREVE", variant: "amber" } },
        { href: "/publico", label: "Público", icon: "ti-users-group", badge: { text: "BREVE", variant: "amber" } },
        { href: "/relatorios", label: "Relatórios", icon: "ti-file-analytics", badge: { text: "BREVE", variant: "amber" } },
        { href: "/ia-insights", label: "Insights IA", icon: "ti-brain", badge: { text: "BREVE", variant: "amber" } },
        { href: "/alertas", label: "Alertas", icon: "ti-bell-ringing", badge: { text: "BREVE", variant: "amber" } },
        { href: "/clientes", label: "Clientes (Ads)", icon: "ti-briefcase" },
      ],
    },
    {
      id: "administracao",
      label: "Administração",
      icon: "ti-shield-lock",
      iconColor: "var(--mk-icon-amber)",
      items: [
        { href: "/canais", label: "Canais", icon: "ti-brand-whatsapp" },
        { href: "/filas", label: "Filas", icon: "ti-list-tree" },
        { href: "/equipes", label: "Equipes", icon: "ti-users-group" },
        { href: "/usuarios", label: "Usuários", icon: "ti-user-circle" },
      ],
    },
    {
      id: "configuracao",
      label: "Configuração",
      icon: "ti-settings",
      iconColor: "var(--mk-icon-blue)",
      items: [
        { href: "/configuracoes", label: "Configurações", icon: "ti-adjustments" },
        { href: "/configuracoes/servicos", label: "Serviços", icon: "ti-package" },
        { href: "/configuracoes/etiquetas", label: "Etiquetas", icon: "ti-tag" },
      ],
    },
  ];

  if (role === "super_admin") {
    list.push({
      id: "super",
      label: "Super Admin",
      icon: "ti-crown",
      iconColor: "#C97064",
      items: [
        { href: "/super-admin/servidores", label: "Servidores UAZAPI", icon: "ti-server" },
        { href: "/super-admin/instancias", label: "Instâncias", icon: "ti-brand-whatsapp" },
      ],
    });
  }

  list.push({
    id: "conta",
    label: "Conta",
    icon: "ti-user",
    iconColor: "var(--mk-icon-green)",
    items: [
      { href: "/conta", label: "Meu Perfil", icon: "ti-user-circle" },
      { href: "/plano", label: "Plano Pro", icon: "ti-credit-card" },
    ],
  });

  return list;
}

export function AppSidebar({ role }: { role?: string } = {}) {
  const pathname = usePathname();
  const { collapsed, toggle, closeMobile } = useCollapse();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<{ prompt: () => Promise<void> } | null>(null);
  useEffect(() => setMounted(true), []);
  // Fecha o drawer mobile sempre que a rota muda
  useEffect(() => {
    closeMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as unknown as { prompt: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  const isDark = mounted && resolvedTheme === "dark";
  const [closedSections, setClosedSections] = useState<Record<string, boolean>>({});
  const SECTIONS = buildSections(role);

  const toggleSection = (id: string) => {
    if (collapsed) return;
    setClosedSections((s) => ({ ...s, [id]: !s[id] }));
  };

  // Item ativo = o href que melhor casa com a rota atual (o mais longo).
  // Evita que /configuracoes e /configuracoes/servicos fiquem ativos juntos.
  const todosHrefs = SECTIONS.flatMap((s) => s.items.map((i) => i.href));
  const melhorMatch = todosHrefs
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === melhorMatch;

  return (
    <aside className="mk-sidebar">
      <div className="sidebar-blob-1" />
      <div className="sidebar-blob-2" />
      <div className="sidebar-content">
        <div className="mk-logo">
          <div className="logo-wrap">
            <span className="logo-text">
              TRÁFEGO<em>&amp;</em>CO
            </span>
          </div>
          <button
            className="collapse-inline"
            onClick={toggle}
            title="Recolher menu"
            aria-label="Recolher menu"
          >
            <span className="collapse-inline-icon">
              <i className="ti ti-layout-sidebar-left-collapse" style={{ fontSize: 16 }} />
            </span>
          </button>
        </div>

        <nav className="sidebar-nav">
        {SECTIONS.map((section) => {
          const closed = !!closedSections[section.id];
          return (
            <div key={section.id} className={`nav-section${closed ? " closed" : ""}`}>
              <button
                className="nav-section-header"
                onClick={() => toggleSection(section.id)}
                type="button"
              >
                <span className="section-icon" style={{ color: section.iconColor }}>
                  <i className={`ti ${section.icon}`} />
                </span>
                <span className="section-label">{section.label}</span>
                <i className="ti ti-chevron-down chevron" />
              </button>
              <div className="nav-items">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item${isActive(item.href) ? " active" : ""}`}
                  >
                    <i className={`ti ${item.icon}`} />
                    <span className="nav-label">{item.label}</span>
                    {item.badge && (
                      <span className={`nav-badge${item.badge.variant ? " " + item.badge.variant : ""}`}>
                        {item.badge.text}
                      </span>
                    )}
                    {item.dot && <span className="nav-dot" />}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
        </nav>

        <div className="sidebar-footer">
          {installPrompt && (
            <button
              type="button"
              className="footer-item"
              onClick={() => installPrompt.prompt()}
              title="Instalar como aplicativo"
              aria-label="Instalar PWA"
            >
              <span className="footer-icon">
                <i className="ti ti-device-mobile-down" />
              </span>
              <span className="footer-text">
                <span className="footer-title">Instalar app</span>
                <span className="footer-sub">PWA</span>
              </span>
            </button>
          )}
          <button
            type="button"
            className="footer-item"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            title={isDark ? "Mudar para claro" : "Mudar para escuro"}
            aria-label="Alternar tema"
          >
            <span className="footer-icon footer-icon-theme">
              <i className={`ti ${isDark ? "ti-moon" : "ti-sun"}`} />
            </span>
            <span className="footer-text">
              <span className="footer-title">{isDark ? "Modo Escuro" : "Modo Claro"}</span>
              <span className="footer-sub">Clique pra alternar</span>
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
