"use client";

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { CountUp, fmtCountBRL } from "@/components/ui/CountUp";
import type { KpisAtendimento, ServicoStat, SerieDiaAtend, SatisfacaoStat, TemposStat } from "@/lib/crm/dashboard-queries";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Segundos → "—" | "45s" | "12m" | "3h 20m" | "2d 4h" */
function fmtDur(seg: number | null): string {
  if (seg === null || seg < 0) return "—";
  if (seg < 60) return `${Math.round(seg)}s`;
  const min = seg / 60;
  if (min < 60) return `${Math.round(min)}m`;
  const h = min / 60;
  if (h < 24) { const hh = Math.floor(h); const mm = Math.round(min - hh * 60); return mm ? `${hh}h ${mm}m` : `${hh}h`; }
  const d = Math.floor(h / 24); const hr = Math.round(h - d * 24); return hr ? `${d}d ${hr}h` : `${d}d`;
}

interface Props {
  kpis: KpisAtendimento;
  servicos: ServicoStat[];
  serie: SerieDiaAtend[];
  satisfacao: SatisfacaoStat;
  tempos: TemposStat;
  periodoLabel: string;
}

export function DashboardAtendimentos({ kpis, servicos, serie, satisfacao, tempos, periodoLabel }: Props) {
  return (
    <>
      <div className="dash-kpis" style={{ marginBottom: 14 }}>
        <Kpi label="Faturamento" valor={<CountUp value={kpis.faturamento_total} kind="brl" />} icon="ti-cash" cor="#00E19A" primary sub={periodoLabel} />
        <Kpi label="Tickets fechados" valor={<CountUp value={kpis.tickets_fechados} />} icon="ti-checks" cor="#94a3b8" sub={periodoLabel} />
        <Kpi label="Serviços vendidos" valor={<CountUp value={kpis.quantidade_total} />} icon="ti-shopping-bag" cor="#94a3b8" sub="soma das quantidades" />
        <Kpi label="Ticket médio" valor={<CountUp value={kpis.ticket_medio} kind="brl" />} icon="ti-trending-up" cor="#94a3b8" sub={periodoLabel} />
      </div>

      <div className="mk-card" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mk-text-muted)", letterSpacing: 0.4, marginBottom: 12 }}>SATISFAÇÃO DOS CLIENTES</div>
        {satisfacao.total === 0 ? (
          <Empty label="Nenhum atendimento analisado no período" />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div style={{ textAlign: "center", minWidth: 90 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: satisfacao.score >= 70 ? "#00E19A" : satisfacao.score >= 40 ? "#f59e0b" : "#e24b4a" }}>{satisfacao.score}%</div>
              <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>satisfeitos</div>
            </div>
            <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 8 }}>
              <SatLinha label="Muito bom" valor={satisfacao.muito_bom} total={satisfacao.total} cor="#00E19A" icon="ti-mood-happy" />
              <SatLinha label="Bom" valor={satisfacao.bom} total={satisfacao.total} cor="#5B8BA6" icon="ti-mood-smile" />
              <SatLinha label="Ruim" valor={satisfacao.ruim} total={satisfacao.total} cor="#e24b4a" icon="ti-mood-sad" />
              <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 2 }}>{satisfacao.total} atendimento(s) analisado(s) · {periodoLabel}</div>
            </div>
          </div>
        )}
      </div>

      <div className="mk-card" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mk-text-muted)", letterSpacing: 0.4, marginBottom: 12 }}>TEMPOS DE ATENDIMENTO</div>
        <div className="dash-kpis">
          <TempoBox
            label="1ª resposta"
            valor={fmtDur(tempos.primeira_resposta_seg)}
            icon="ti-clock-bolt"
            n={tempos.amostras.primeira}
            dica="Tempo médio entre a abertura do ticket e a primeira resposta do atendente."
          />
          <TempoBox
            label="Resposta ao cliente"
            valor={fmtDur(tempos.resposta_media_seg)}
            icon="ti-message-dots"
            n={tempos.amostras.resposta}
            dica="Espera média do cliente por uma resposta, cada vez que ele escreve."
          />
          <TempoBox
            label="Até o fechamento"
            valor={fmtDur(tempos.ate_fechamento_seg)}
            icon="ti-clock-check"
            n={tempos.amostras.fechamento}
            dica="Tempo médio entre abrir e fechar o atendimento."
          />
        </div>
        <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 10 }}>
          Calculado sobre os tickets abertos no período · {periodoLabel}
        </div>
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
                <Line type="monotone" dataKey="faturamento" stroke="#00E19A" strokeWidth={2} dot={false} />
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

function Kpi({ label, valor, icon, cor, sub, primary }: { label: string; valor: React.ReactNode; icon: string; cor: string; sub?: string; primary?: boolean }) {
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

function TempoBox({ label, valor, icon, n, dica }: { label: string; valor: string; icon: string; n: number; dica: string }) {
  return (
    <div className="mk-card" style={{ padding: 14 }} title={dica}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", letterSpacing: 0.4 }}>{label.toUpperCase()}</div>
        <i className={`ti ${icon}`} style={{ fontSize: 14, color: "#00E19A" }} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: "var(--mk-text)" }}>{valor}</div>
      <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 2 }}>{n > 0 ? `${n} amostra${n > 1 ? "s" : ""}` : "sem dados"}</div>
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
