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
  ACTIVE: "#7BA05B",
  PAUSED: "#C9A227",
  DELETED: "#A0563B",
  ARCHIVED: "#7B7A78",
  DESCONHECIDO: "#5C5957",
};

export function GastoReceitaChart({ data }: { data: PontoSerie[] }) {
  const formatted = data.map((p) => ({
    ...p,
    dataLabel: format(parseISO(p.data), "dd/MM", { locale: ptBR }),
  }));

  return (
    <div className="mk-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="label-tiny">Investido × Faturamento (diário)</span>
      </div>
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradGasto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7BA05B" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#7BA05B" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9A227" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#C9A227" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="dataLabel" stroke="var(--mk-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--mk-text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => fmtBRL(v)} width={70} />
            <Tooltip
              contentStyle={{ background: "var(--mk-surface-2)", border: "1px solid var(--mk-border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v, name) => [fmtBRL(Number(v)), name === "gasto" ? "Investido" : "Faturamento"]}
              labelStyle={{ color: "var(--mk-text)" }}
            />
            <Area type="monotone" dataKey="gasto" stroke="#7BA05B" fill="url(#gradGasto)" strokeWidth={2} />
            <Area type="monotone" dataKey="receita" stroke="#C9A227" fill="url(#gradReceita)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TopCampanhasChart({ data }: { data: TopCampanha[] }) {
  if (data.length === 0) {
    return (
      <div className="mk-card" style={{ padding: 16 }}>
        <span className="label-tiny">Top 5 campanhas (por gasto)</span>
        <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--mk-text-muted)", fontSize: 12 }}>
          Sem campanhas no período
        </div>
      </div>
    );
  }

  return (
    <div className="mk-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="label-tiny">Top 5 campanhas (por gasto)</span>
      </div>
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" stroke="var(--mk-text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => fmtBRL(v)} />
            <YAxis type="category" dataKey="nome" stroke="var(--mk-text-muted)" fontSize={10.5} tickLine={false} axisLine={false} width={160} interval={0} />
            <Tooltip
              contentStyle={{ background: "var(--mk-surface-2)", border: "1px solid var(--mk-border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [fmtBRL(Number(v)), "Gasto"]}
              labelStyle={{ color: "var(--mk-text)" }}
            />
            <Bar dataKey="gasto" fill="#7BA05B" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
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
    <div className="mk-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="label-tiny">Status das campanhas</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, height: 240 }}>
        <div style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {data.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#5C5957"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "var(--mk-surface-2)", border: "1px solid var(--mk-border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v, n) => [fmtInt(Number(v)), String(n)]}
                labelStyle={{ color: "var(--mk-text)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5 }}>
          {data.map((d) => (
            <div key={d.status} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: STATUS_COLORS[d.status] || "#5C5957",
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, color: "var(--mk-text)" }}>{d.status}</span>
              <span style={{ color: "var(--mk-text-muted)" }}>{fmtInt(d.count)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
