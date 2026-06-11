"use client";

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import type { KpisAtendimento, ServicoStat, SerieDiaAtend, SatisfacaoStat } from "@/lib/crm/dashboard-queries";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  kpis: KpisAtendimento;
  servicos: ServicoStat[];
  serie: SerieDiaAtend[];
  satisfacao: SatisfacaoStat;
  periodoLabel: string;
}

export function DashboardAtendimentos({ kpis, servicos, serie, satisfacao, periodoLabel }: Props) {
  return (
    <>
      <div className="dash-kpis" style={{ marginBottom: 14 }}>
        <Kpi label="Faturamento" valor={BRL.format(kpis.faturamento_total)} icon="ti-cash" cor="#10b981" primary sub={periodoLabel} />
        <Kpi label="Tickets fechados" valor={String(kpis.tickets_fechados)} icon="ti-checks" cor="#94a3b8" sub={periodoLabel} />
        <Kpi label="Serviços vendidos" valor={String(kpis.quantidade_total)} icon="ti-shopping-bag" cor="#94a3b8" sub="soma das quantidades" />
        <Kpi label="Ticket médio" valor={BRL.format(kpis.ticket_medio)} icon="ti-trending-up" cor="#94a3b8" sub={periodoLabel} />
      </div>

      <div className="mk-card" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mk-text-muted)", letterSpacing: 0.4, marginBottom: 12 }}>SATISFAÇÃO DOS CLIENTES</div>
        {satisfacao.total === 0 ? (
          <Empty label="Nenhum atendimento analisado no período" />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div style={{ textAlign: "center", minWidth: 90 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: satisfacao.score >= 70 ? "#10b981" : satisfacao.score >= 40 ? "#f59e0b" : "#e24b4a" }}>{satisfacao.score}%</div>
              <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>satisfeitos</div>
            </div>
            <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 8 }}>
              <SatLinha label="Muito bom" valor={satisfacao.muito_bom} total={satisfacao.total} cor="#10b981" icon="ti-mood-happy" />
              <SatLinha label="Bom" valor={satisfacao.bom} total={satisfacao.total} cor="#5B8BA6" icon="ti-mood-smile" />
              <SatLinha label="Ruim" valor={satisfacao.ruim} total={satisfacao.total} cor="#e24b4a" icon="ti-mood-sad" />
              <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 2 }}>{satisfacao.total} atendimento(s) analisado(s) · {periodoLabel}</div>
            </div>
          </div>
        )}
      </div>

      <div className="dash-2col" style={{ marginTop: 14 }}>
        <div className="mk-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mk-text-muted)", letterSpacing: 0.4, marginBottom: 10 }}>FATURAMENTO DIÁRIO</div>
          {serie.length === 0 ? (
            <Empty label="Sem fechamentos no período" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={serie}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,239,228,0.06)" />
                <XAxis dataKey="data" tick={{ fontSize: 10, fill: "var(--mk-text-muted)" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "var(--mk-text-muted)" }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip contentStyle={{ background: "var(--mk-surface)", border: "0.5px solid var(--mk-border)", borderRadius: 8, fontSize: 11 }} formatter={(v) => BRL.format(Number(v) || 0)} />
                <Line type="monotone" dataKey="faturamento" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mk-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mk-text-muted)", letterSpacing: 0.4, marginBottom: 10 }}>TICKETS FECHADOS / DIA</div>
          {serie.length === 0 ? (
            <Empty label="Sem dados" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={serie}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,239,228,0.06)" />
                <XAxis dataKey="data" tick={{ fontSize: 10, fill: "var(--mk-text-muted)" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "var(--mk-text-muted)" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--mk-surface)", border: "0.5px solid var(--mk-border)", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="tickets" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mk-card" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mk-text-muted)", letterSpacing: 0.4, marginBottom: 12 }}>TOP SERVIÇOS</div>
        {servicos.length === 0 ? (
          <Empty label="Nenhum serviço fechado ainda" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid var(--mk-border)" }}>
                  <Th>Serviço</Th>
                  <Th align="right">Quantidade</Th>
                  <Th align="right">Tickets</Th>
                  <Th align="right">Faturamento</Th>
                </tr>
              </thead>
              <tbody>
                {servicos.map((s) => (
                  <tr key={s.servico} style={{ borderBottom: "0.5px solid var(--mk-border)" }}>
                    <Td>{s.servico}</Td>
                    <Td align="right">{s.quantidade}</Td>
                    <Td align="right">{s.tickets}</Td>
                    <Td align="right" bold>{BRL.format(s.faturamento)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Kpi({ label, valor, icon, cor, sub, primary }: { label: string; valor: string; icon: string; cor: string; sub?: string; primary?: boolean }) {
  return (
    <div className="mk-card" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", letterSpacing: 0.4 }}>{label.toUpperCase()}</div>
        <i className={`ti ${icon}`} style={{ fontSize: 14, color: cor }} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: primary ? cor : "var(--mk-text)" }}>{valor}</div>
      {sub && <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SatLinha({ label, valor, total, cor, icon }: { label: string; valor: number; total: number; cor: string; icon: string }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <i className={`ti ${icon}`} style={{ color: cor, fontSize: 15, width: 18 }} />
      <span style={{ fontSize: 11.5, color: "var(--mk-text-secondary)", width: 70 }}>{label}</span>
      <div style={{ flex: 1, height: 7, borderRadius: 4, background: "var(--mk-surface-2)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: cor, transition: "width 0.3s ease" }} />
      </div>
      <span style={{ fontSize: 11, color: "var(--mk-text-muted)", width: 52, textAlign: "right" }}>{valor} · {pct}%</span>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return <th style={{ padding: "8px 6px", textAlign: align || "left", fontSize: 10.5, fontWeight: 600, color: "var(--mk-text-muted)", letterSpacing: 0.4 }}>{children}</th>;
}
function Td({ children, align, bold }: { children: React.ReactNode; align?: "right"; bold?: boolean }) {
  return <td style={{ padding: "9px 6px", textAlign: align || "left", fontSize: 12, fontWeight: bold ? 600 : 400, color: "var(--mk-text)" }}>{children}</td>;
}
function Empty({ label }: { label: string }) {
  return <div style={{ textAlign: "center", padding: 40, fontSize: 12, color: "var(--mk-text-muted)" }}><i className="ti ti-database-off" style={{ display: "block", fontSize: 28, marginBottom: 6, opacity: 0.6 }} />{label}</div>;
}
