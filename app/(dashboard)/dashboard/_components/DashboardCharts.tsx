"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fmtBRL, fmtInt } from "@/lib/format";
import type { DistribStatus, PontoSerie, TopCampanha } from "@/lib/meta-ads/queries";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#4DECB3",
  PAUSED: "#FBBF24",
  DELETED: "#FB7185",
  ARCHIVED: "rgba(255,255,255,0.22)",
  DESCONHECIDO: "rgba(255,255,255,0.22)",
};

const STATUS_PT: Record<string, string> = {
  ACTIVE: "Ativas",
  PAUSED: "Pausadas",
  DELETED: "Excluídas",
  ARCHIVED: "Arquivadas",
  DESCONHECIDO: "Outras",
};

export function GastoReceitaChart({ data }: { data: PontoSerie[] }) {
  const formatted = data.map((p) => ({
    ...p,
    dataLabel: format(parseISO(p.data), "dd/MM", { locale: ptBR }),
  }));

  return (
    <div className="mk-card" style={{ padding: 18, borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span className="label-tiny">Investido × Faturamento (diário)</span>
        <div style={{ display: "flex", gap: 14 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--mk-text-secondary)" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: "#F0A35E" }} />
            Investido
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--mk-text-secondary)" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: "var(--mk-accent-2)" }} />
            Faturamento
          </span>
        </div>
      </div>
      <div style={{ height: 248 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradGasto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F0A35E" stopOpacity={0.34} />
                <stop offset="100%" stopColor="#F0A35E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00E19A" stopOpacity={0.30} />
                <stop offset="100%" stopColor="#00E19A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="dataLabel" stroke="var(--mk-text-muted)" fontSize={10.5} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--mk-text-muted)" fontSize={10.5} tickLine={false} axisLine={false} tickFormatter={(v) => fmtBRL(v)} width={70} />
            <Tooltip
              cursor={{ stroke: "rgba(52,211,153,0.28)", strokeWidth: 1 }}
              contentStyle={{
                background: "rgba(10,12,11,0.96)",
                border: "0.5px solid rgba(52,211,153,0.32)",
                borderRadius: 11,
                fontSize: 12,
                padding: "10px 12px",
                boxShadow: "0 14px 40px rgba(0,0,0,0.6)",
              }}
              formatter={(v, name) => [fmtBRL(Number(v)), name === "gasto" ? "Investido" : "Faturamento"]}
              labelStyle={{ color: "#fff", fontWeight: 700, fontSize: 11, marginBottom: 4 }}
              itemStyle={{ color: "var(--mk-text-secondary)", padding: "1px 0" }}
            />
            <Area type="monotone" dataKey="receita" stroke="#4DECB3" fill="url(#gradReceita)" strokeWidth={2.5} />
            <Area type="monotone" dataKey="gasto" stroke="#F0A35E" fill="url(#gradGasto)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Top 5 — barras horizontais customizadas (não Recharts) seguindo o mockup:
 * nome à esquerda em texto direito-alinhado, barra com gradient teal→verde,
 * valor dentro da barra à direita.
 */
export function TopCampanhasChart({ data }: { data: TopCampanha[] }) {
  if (data.length === 0) {
    return (
      <div className="mk-card" style={{ padding: 18, borderRadius: 16 }}>
        <span className="label-tiny">Top 5 campanhas (por gasto)</span>
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--mk-text-muted)", fontSize: 12 }}>
          Sem campanhas no período
        </div>
      </div>
    );
  }
  const maxGasto = Math.max(...data.map((d) => d.gasto));
  return (
    <div className="mk-card" style={{ padding: 18, borderRadius: 16 }}>
      <span className="label-tiny">Top 5 campanhas (por gasto)</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 16 }}>
        {data.map((c) => {
          const w = maxGasto > 0 ? (c.gasto / maxGasto) * 100 : 0;
          return (
            <div key={c.campanha_id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span
                style={{
                  flex: "0 0 230px",
                  fontSize: 12,
                  color: "var(--mk-text-secondary)",
                  textAlign: "right",
                  lineHeight: 1.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={c.nome}
              >
                {c.nome}
              </span>
              <div style={{ flex: 1, height: 26, background: "rgba(255,255,255,0.03)", borderRadius: 7, overflow: "hidden", position: "relative" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${w}%`,
                    background: "linear-gradient(90deg, var(--mk-icon-blue), var(--mk-accent-2))",
                    borderRadius: 7,
                    transition: "width .9s cubic-bezier(.2,.8,.2,1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 10,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#04130d", whiteSpace: "nowrap" }}>
                    {fmtBRL(c.gasto)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StatusDonut({ data }: { data: DistribStatus[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return (
      <div className="mk-card" style={{ padding: 16 }}>
        <span className="label-tiny">Status das campanhas</span>
        <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--mk-text-muted)", fontSize: 12 }}>
          Nenhuma campanha sincronizada
        </div>
      </div>
    );
  }

  return (
    <div className="mk-card" style={{ padding: 18, borderRadius: 16, display: "flex", flexDirection: "column" }}>
      <span className="label-tiny">Status das campanhas</span>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 10, flex: 1 }}>
        <div style={{ position: "relative", width: 150, height: 150, flex: "none" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={56} outerRadius={70} paddingAngle={2} stroke="none">
                {data.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "rgba(255,255,255,0.22)"} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: "var(--mk-text)", lineHeight: 1 }}>{fmtInt(total)}</span>
            <span style={{ fontSize: 10, color: "var(--mk-text-muted)", marginTop: 2 }}>campanhas</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
          {data.map((d) => (
            <div key={d.status} style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 3,
                  background: STATUS_COLORS[d.status] || "rgba(255,255,255,0.22)",
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, color: "var(--mk-text-secondary)", fontSize: 12.5 }}>{STATUS_PT[d.status] || d.status}</span>
              <span style={{ color: "var(--mk-text)", fontWeight: 700, fontSize: 13 }}>{fmtInt(d.count)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
