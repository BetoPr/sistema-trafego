"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

interface KPIs {
  criadas: number; abertos: number; ganhos: number; perdidos: number;
  ticketMedio: number; taxaConv: number; totalGanho: number;
}
interface StatusItem { nome: string; valor: number; cor: string }
interface EtapaItem { nome: string; qtd: number; valor: number; cor: string }
interface MesItem { mes: string; qtd: number }
interface EtiquetaItem { id: string; nome: string; cor: string; qtd: number; valor: number }
interface KanbanItem { id: string; nome: string; cor: string; qtd: number; valor: number }

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function fmtBRL(v: number): string { return BRL.format(v); }
function fmtPct(v: number): string { return `${v.toFixed(2).replace(".", ",")}%`; }
function fmtMes(yyyymm: string): string {
  const [y, m] = yyyymm.split("-");
  if (!y || !m) return yyyymm;
  const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${meses[Number(m)-1] || m}/${y.slice(2)}`;
}

export function DashboardClient({
  kpis,
  porStatus,
  porEtapa,
  porMes,
  valorPorEtapa,
  porEtiqueta,
  porKanban,
  pipelinesAtivos,
}: {
  kpis: KPIs;
  porStatus: StatusItem[];
  porEtapa: EtapaItem[];
  porMes: MesItem[];
  valorPorEtapa: EtapaItem[];
  porEtiqueta: EtiquetaItem[];
  porKanban: KanbanItem[];
  pipelinesAtivos: { quadros: number; etapas: number };
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* KPIs row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <Kpi label="Criadas" valor={kpis.criadas.toString()} icone="ti-users" cor="#5cd0ff" />
        <Kpi label="Abertos" valor={kpis.abertos.toString()} icone="ti-target" cor="#FFB547" />
        <Kpi label="Ganhos" valor={kpis.ganhos.toString()} icone="ti-trending-up" cor="#00E19A" />
        <Kpi label="Perdidos" valor={kpis.perdidos.toString()} icone="ti-circle-x" cor="#FF5C72" />
        <Kpi label="Ticket Médio" valor={fmtBRL(kpis.ticketMedio)} icone="ti-currency-dollar" cor="#9B7DBF" />
        <Kpi label="Taxa Conversão" valor={fmtPct(kpis.taxaConv)} icone="ti-percentage" cor="#00E19A" />
      </div>

      {/* TOTAL GANHO */}
      <div className="mk-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderLeft: "3px solid #00E19A" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--mk-text-muted)", letterSpacing: 0.5, textTransform: "uppercase" }}>
            <i className="ti ti-trending-up" style={{ marginRight: 4 }} /> Total Ganho (vendido)
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#00E19A", marginTop: 4 }}>{fmtBRL(kpis.totalGanho)}</div>
          <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 2 }}>{kpis.ganhos} oportunidade{kpis.ganhos === 1 ? "" : "s"} ganha{kpis.ganhos === 1 ? "" : "s"}</div>
        </div>
      </div>

      {/* Status (donut) + Etapa (bar) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card titulo="Oportunidades por Status">
          {porStatus.every((s) => s.valor === 0) ? (
            <Vazio />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={porStatus} dataKey="valor" nameKey="nome" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {porStatus.map((s, i) => <Cell key={i} fill={s.cor} />)}
                </Pie>
                <Tooltip formatter={(v) => [String(v), "Oportunidades"]} contentStyle={{ background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 6 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card titulo="Oportunidades por Etapa">
          {porEtapa.length === 0 ? (
            <Vazio />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={porEtapa}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--mk-border)" />
                <XAxis dataKey="nome" tick={{ fontSize: 10, fill: "var(--mk-text-muted)" }} angle={-12} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: "var(--mk-text-muted)" }} />
                <Tooltip formatter={(v) => [String(v), "Oportunidades"]} contentStyle={{ background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 6 }} />
                <Bar dataKey="qtd" name="Qtd">
                  {porEtapa.map((e, i) => <Cell key={i} fill={e.cor} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Por mês */}
      <Card titulo="Oportunidades por Mês">
        {porMes.length === 0 ? (
          <Vazio />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={porMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--mk-border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--mk-text-muted)" }} tickFormatter={fmtMes} />
              <YAxis tick={{ fontSize: 10, fill: "var(--mk-text-muted)" }} />
              <Tooltip labelFormatter={(l) => fmtMes(String(l))} formatter={(v) => [String(v), "Oportunidades"]} contentStyle={{ background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 6 }} />
              <Bar dataKey="qtd" fill="#FFB547" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Valor por etapa */}
      <Card titulo="Valor por Etapa">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, padding: 12 }}>
          {valorPorEtapa.length === 0 && <Vazio />}
          {valorPorEtapa.map((e) => (
            <div key={e.nome} style={{ background: "var(--mk-surface-2)", border: ".5px solid var(--mk-border)", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{e.nome}</span>
                <span style={{ fontSize: 12, color: "#00E19A", fontWeight: 700 }}>{fmtBRL(e.valor)}</span>
              </div>
              <div style={{ height: 4, background: "var(--mk-border)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", background: e.cor, width: `${Math.min(100, (e.qtd / Math.max(...valorPorEtapa.map((x) => x.qtd))) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Por etiqueta + por kanban + pipelines */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Card titulo="Por Etiqueta">
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {porEtiqueta.length === 0 && <Vazio />}
            {porEtiqueta.map((e) => (
              <div key={e.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 2 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: e.cor }} />
                    {e.nome}
                  </span>
                  <span style={{ color: "var(--mk-text-muted)" }}>{e.qtd} · {fmtBRL(e.valor)}</span>
                </div>
                <div style={{ height: 4, background: "var(--mk-border)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: e.cor, width: `${Math.min(100, (e.qtd / Math.max(...porEtiqueta.map((x) => x.qtd))) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card titulo="Por Kanban (Pipeline)">
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {porKanban.length === 0 && <Vazio />}
            {porKanban.map((k) => (
              <div key={k.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 2 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: k.cor }} />
                    {k.nome}
                  </span>
                  <span style={{ color: "var(--mk-text-muted)" }}>{k.qtd} · {fmtBRL(k.valor)}</span>
                </div>
                <div style={{ height: 4, background: "var(--mk-border)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: k.cor, width: `${Math.min(100, (k.qtd / Math.max(...porKanban.map((x) => x.qtd || 1))) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card titulo="Pipelines Ativos">
          <div style={{ padding: 12, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", minHeight: 140 }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#00E19A" }}>{pipelinesAtivos.quadros}</div>
            <div style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>{pipelinesAtivos.etapas} etapa{pipelinesAtivos.etapas === 1 ? "" : "s"} no total</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, valor, icone, cor }: { label: string; valor: string; icone: string; cor: string }) {
  return (
    <div style={{ background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--mk-text-muted)", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
        <i className={`ti ${icone}`} style={{ color: cor, fontSize: 14 }} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: "var(--mk-text)" }}>{valor}</div>
    </div>
  );
}

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mk-card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: ".5px solid var(--mk-border)", fontSize: 12, fontWeight: 700 }}>{titulo}</div>
      {children}
    </div>
  );
}

function Vazio() {
  return (
    <div style={{ padding: 30, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 11.5 }}>
      <i className="ti ti-database-off" style={{ display: "block", fontSize: 22, marginBottom: 6, opacity: 0.6 }} />
      Sem dados ainda.
    </div>
  );
}
