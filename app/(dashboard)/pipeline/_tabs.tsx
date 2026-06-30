"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: Array<{ slug: string; label: string; icon: string }> = [
  { slug: "dashboard", label: "Dashboard", icon: "ti-chart-pie" },
  { slug: "kanban", label: "Kanban", icon: "ti-layout-kanban" },
  { slug: "pipelines", label: "Pipelines", icon: "ti-route" },
  { slug: "etiquetas", label: "Etiquetas", icon: "ti-tag" },
];

export function PipelineTabs() {
  const pathname = usePathname() || "";
  const ativaSlug = TABS.find((t) => pathname.startsWith(`/pipeline/${t.slug}`))?.slug ?? "kanban";

  return (
    <nav style={{ display: "flex", gap: 4, borderBottom: ".5px solid var(--mk-border)", marginBottom: 16, overflowX: "auto" }}>
      {TABS.map((t) => {
        const ativa = t.slug === ativaSlug;
        return (
          <Link
            key={t.slug}
            href={`/pipeline/${t.slug}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 14px",
              fontSize: 12.5,
              fontWeight: ativa ? 700 : 500,
              color: ativa ? "#00E19A" : "var(--mk-text-secondary)",
              borderBottom: ativa ? "2px solid #00E19A" : "2px solid transparent",
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "color 0.15s",
            }}
          >
            <i className={`ti ${t.icon}`} style={{ fontSize: 14 }} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
