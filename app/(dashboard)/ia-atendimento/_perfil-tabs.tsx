"use client";

/**
 * Abas do editor de perfil de IA.
 *
 * O conteúdo (form + blocos) é server-rendered e passado como children.
 * Os painéis usam display:none (não desmontam) — assim o <form> único
 * continua submetendo TODOS os campos, mesmo os de abas escondidas.
 *
 * <Tab when="..."> pode aparecer várias vezes pra mesma aba (ex: campos do
 * form + bloco externo na mesma aba). `when` aceita string ou lista.
 */
import { createContext, useContext, useState, type ReactNode } from "react";

interface TabDef {
  id: string;
  label: string;
  icon: string;
}

const TabCtx = createContext<string>("");

export function PerfilTabs({ tabs, children }: { tabs: TabDef[]; children: ReactNode }) {
  const [active, setActive] = useState(tabs[0]?.id || "");

  return (
    <TabCtx.Provider value={active}>
      <div
        style={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          marginBottom: 18,
          borderBottom: "0.5px solid var(--mk-border)",
        }}
      >
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "10px 18px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
                background: "transparent",
                border: 0,
                borderBottom: on ? "2px solid var(--mk-accent)" : "2px solid transparent",
                color: on ? "var(--mk-text)" : "var(--mk-text-muted)",
                marginBottom: -1,
                transition: "color 0.15s ease",
              }}
            >
              <i className={`ti ${t.icon}`} style={{ fontSize: 16, color: on ? "var(--mk-accent)" : "inherit" }} />
              {t.label}
            </button>
          );
        })}
      </div>
      {children}
    </TabCtx.Provider>
  );
}

export function Tab({ when, children }: { when: string | string[]; children: ReactNode }) {
  const active = useContext(TabCtx);
  const visivel = Array.isArray(when) ? when.includes(active) : when === active;
  return (
    <div style={{ display: visivel ? "flex" : "none", flexDirection: "column", gap: 12, animation: visivel ? "tab-fade 0.25s ease" : undefined }}>
      {children}
      <style>{`@keyframes tab-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
