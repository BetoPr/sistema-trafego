"use client";

import { useState } from "react";

const ITEMS = [
  { id: "email-notif", label: "Notificações por e-mail", desc: "Alertas, relatórios e atualizações.", on: true },
  { id: "resumo-diario", label: "Resumo diário", desc: "Todo dia às 9h.", on: false },
  { id: "modo-escuro", label: "Modo escuro automático", desc: "Sincronizar com sistema.", on: true },
];

export function ConfigToggles() {
  const [state, setState] = useState(() => Object.fromEntries(ITEMS.map((i) => [i.id, i.on])) as Record<string, boolean>);
  const flip = (id: string) => setState((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div style={{ marginTop: 14 }}>
      {ITEMS.map((item, idx) => (
        <div
          key={item.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0",
            borderBottom: idx < ITEMS.length - 1 ? "0.5px solid var(--mk-border-soft)" : "none",
          }}
        >
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--mk-text)" }}>{item.label}</div>
            <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>{item.desc}</div>
          </div>
          <button
            type="button"
            className={`mk-toggle${state[item.id] ? " on" : ""}`}
            onClick={() => flip(item.id)}
            aria-pressed={state[item.id]}
            aria-label={item.label}
          >
            <div className="toggle-knob" />
          </button>
        </div>
      ))}
    </div>
  );
}
