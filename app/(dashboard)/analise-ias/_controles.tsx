"use client";

import { useRouter } from "next/navigation";

const PERIODOS: [number, string][] = [[1, "Hoje"], [7, "7 dias"], [30, "30 dias"]];
const PROVIDERS: [string, string][] = [["todos", "Todos"], ["groq", "GroqCloud"], ["openai", "OpenAI"], ["anthropic", "Anthropic"]];

export function Controles({ provider, dias }: { provider: string; dias: number }) {
  const router = useRouter();
  function ir(np: string, nd: number) {
    router.push(`/analise-ias?provider=${np}&dias=${nd}`);
  }
  return (
    <div className="mk-card" style={{ padding: 12, marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "var(--mk-text-muted)", fontWeight: 600 }}>Provedor</span>
        <select value={provider} onChange={(e) => ir(e.target.value, dias)} style={{ padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 }}>
          {PROVIDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--mk-text-muted)", fontWeight: 600 }}>Período</span>
        {PERIODOS.map(([v, l]) => {
          const on = dias === v;
          return (
            <button key={v} onClick={() => ir(provider, v)} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", border: `1px solid ${on ? "var(--mk-accent)" : "var(--mk-border)"}`, background: on ? "rgba(16,185,129,0.16)" : "var(--mk-surface-2)", color: on ? "var(--mk-accent)" : "var(--mk-text-muted)" }}>{l}</button>
          );
        })}
      </div>
    </div>
  );
}
