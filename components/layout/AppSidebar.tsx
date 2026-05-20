"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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

const SECTIONS: NavSection[] = [
  {
    id: "principal",
    label: "Principal",
    icon: "ti-layout-grid",
    iconColor: "var(--mk-icon-green)",
    items: [
      { href: "/dashboard", label: "Visão geral", icon: "ti-home" },
      { href: "/campanhas", label: "Campanhas", icon: "ti-speakerphone" },
      { href: "/funil", label: "Funil", icon: "ti-filter" },
    ],
  },
  {
    id: "analise",
    label: "Análise",
    icon: "ti-chart-pie",
    iconColor: "var(--mk-icon-blue)",
    items: [
      {
        href: "/criativos",
        label: "Criativos",
        icon: "ti-photo-square-rounded",
        badge: { text: "NOVO" },
      },
      { href: "/publico", label: "Público", icon: "ti-users-group" },
      { href: "/relatorios", label: "Relatórios", icon: "ti-file-analytics" },
    ],
  },
  {
    id: "inteligencia",
    label: "Inteligência",
    icon: "ti-sparkles",
    iconColor: "var(--mk-icon-purple)",
    items: [
      { href: "/alertas", label: "Alertas", icon: "ti-bell-ringing", dot: true },
      {
        href: "/ia-insights",
        label: "Insights IA",
        icon: "ti-brain",
        badge: { text: "BREVE", variant: "amber" },
      },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    icon: "ti-users",
    iconColor: "var(--mk-icon-pink)",
    items: [
      {
        href: "/clientes",
        label: "Clientes",
        icon: "ti-briefcase",
        badge: { text: "12" },
      },
      { href: "/integracoes", label: "Integrações", icon: "ti-plug" },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    icon: "ti-settings",
    iconColor: "var(--mk-icon-amber)",
    items: [
      { href: "/configuracoes", label: "Configurações", icon: "ti-user-cog" },
      { href: "/plano", label: "Plano Pro", icon: "ti-credit-card" },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useCollapse();
  const [closedSections, setClosedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    if (collapsed) return;
    setClosedSections((s) => ({ ...s, [id]: !s[id] }));
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

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
      </div>
    </aside>
  );
}
