"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardAtendimentos } from "./DashboardAtendimentos";
import type { KpisAtendimento, ServicoStat, SerieDiaAtend } from "@/lib/crm/dashboard-queries";

interface Dados {
  kpis: KpisAtendimento;
  servicos: ServicoStat[];
  serie: SerieDiaAtend[];
  label: string;
}

const PRESETS = [
  { id: "hoje", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
] as const;

/**
 * Dashboard de Atendimentos SPA: filtros são estado local + fetch — sem
 * navegação, URL parada em /dashboard. Dados iniciais vêm do server.
 */
export function AtendimentosLive({ inicial }: { inicial: Dados }) {
  const [periodo, setPeriodo] = useState<string>("30d");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [custom, setCustom] = useState(false);
  const [dados, setDados] = useState<Dados>(inicial);
  const [loading, setLoading] = useState(false);
  const reqRef = useRef(0);

  async function buscar(qs: string) {
    const req = ++reqRef.current;
    setLoading(true);
    try {
      const r = await fetch(`/api/dashboard/atendimentos?${qs}`);
      const j = await r.json();
      if (req === reqRef.current && r.ok) setDados(j);
    } finally {
      if (req === reqRef.current) setLoading(false);
    }
  }

  function preset(id: string) {
    setPeriodo(id);
    setCustom(false);
    buscar(`periodo=${id}`);
  }

  function aplicarCustom() {
    if (!de || !ate) return;
    setPeriodo("");
    buscar(`de=${de}&ate=${ate}`);
  }

  // Auto-refresh leve a cada 60s no período ativo
  useEffect(() => {
    const iv = setInterval(() => {
      if (periodo) buscar(`periodo=${periodo}`);
      else if (de && ate) buscar(`de=${de}&ate=${ate}`);
    }, 60000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, de, ate]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--mk-surface)", borderRadius: 10, border: "0.5px solid var(--mk-border)" }}>
          {PRESETS.map((p) => {
            const active = !custom && p.id === periodo;
            return (
              <button
                key={p.id}
                onClick={() => preset(p.id)}
                style={{ padding: "5px 12px", fontSize: 12, borderRadius: 6, border: 0, background: active ? "var(--mk-surface-2)" : "transparent", color: active ? "var(--mk-text)" : "var(--mk-text-muted)", fontWeight: active ? 600 : 400, cursor: "pointer" }}
              >
                {p.label}
              </button>
            );
          })}
          <button
            onClick={() => setCustom((s) => !s)}
            style={{ padding: "5px 12px", fontSize: 12, borderRadius: 6, border: 0, background: custom ? "var(--mk-surface-2)" : "transparent", color: custom ? "var(--mk-text)" : "var(--mk-text-muted)", fontWeight: custom ? 600 : 400, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
          >
            <i className="ti ti-calendar" /> Período X a Y
          </button>
        </div>

        {custom && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", padding: 4, background: "var(--mk-surface)", borderRadius: 10, border: "0.5px solid var(--mk-border)" }}>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} style={dateInp} />
            <span style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>até</span>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} style={dateInp} />
            <button onClick={aplicarCustom} disabled={!de || !ate} style={{ padding: "5px 10px", fontSize: 11, borderRadius: 6, border: "0.5px solid var(--mk-accent)", background: "var(--mk-accent)", color: "#1a1a1a", cursor: de && ate ? "pointer" : "not-allowed", opacity: de && ate ? 1 : 0.5, fontWeight: 600 }}>
              Aplicar
            </button>
          </div>
        )}

        {loading && (
          <span style={{ fontSize: 11, color: "var(--mk-text-muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <i className="ti ti-loader-2" style={{ animation: "spin 0.8s linear infinite", display: "inline-block" }} /> atualizando…
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </span>
        )}
      </div>

      <div style={{ opacity: loading ? 0.6 : 1, transition: "opacity 0.15s ease" }}>
        <DashboardAtendimentos kpis={dados.kpis} servicos={dados.servicos} serie={dados.serie} periodoLabel={dados.label} />
      </div>
    </>
  );
}

const dateInp: React.CSSProperties = { background: "var(--mk-surface-2)", border: "0.5px solid var(--mk-border)", borderRadius: 6, padding: "5px 8px", color: "var(--mk-text)", fontSize: 11.5, colorScheme: "dark" };
