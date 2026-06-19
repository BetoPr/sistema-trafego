import { requireAdmin } from "@/lib/crm/permissions";
import { agregarUso } from "@/lib/ai/relatorio";
import { Controles } from "./_controles";
import { ExportarUso } from "./_exportar";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ provider?: string; dias?: string }>;
}

const nf = new Intl.NumberFormat("pt-BR");
function usd(n: number): string {
  return "$" + (n < 1 ? n.toFixed(4) : n.toFixed(2));
}
function pct(parte: number, total: number): string {
  return total ? `${Math.round((parte / total) * 100)}%` : "—";
}

export default async function AnaliseIAsPage({ searchParams }: PageProps) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const provider = sp.provider === "groq" || sp.provider === "openai" || sp.provider === "anthropic" ? sp.provider : "todos";
  const dias = [1, 7, 30].includes(Number(sp.dias)) ? Number(sp.dias) : 7;

  const d = await agregarUso(ctx.agenciaId, { provider, dias });
  const maxDia = Math.max(1, ...d.porDia.map((x) => x.tokens));
  const usoChatPct = Math.min(100, Math.round((d.chatGroqHoje / Math.max(1, d.limiteChatDia)) * 100));

  return (
    <section className="mk-page">
      <div className="mk-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mk-eyebrow">Configuração · IA</div>
          <h1 className="mk-page-title">Análise de IAs</h1>
          <p className="mk-page-sub">Uso de tokens, custo e desempenho das IAs — por sessão, provider, usuário e cliente.</p>
        </div>
        <ExportarUso provider={provider} dias={dias} log={d.log} />
      </div>

      <Controles provider={provider} dias={dias} />

      {d.totais.chamadas === 0 ? (
        <div className="mk-card mk-card-lg" style={{ textAlign: "center", padding: 40, color: "var(--mk-text-muted)", fontSize: 13 }}>
          <i className="ti ti-chart-bar" style={{ fontSize: 30, display: "block", marginBottom: 8, opacity: 0.6 }} />
          Nenhum uso de IA registrado nesse período/provedor ainda. Use o Follow-up, resumo ou transcrição que os dados aparecem aqui.
        </div>
      ) : (
        <>
          {/* Cards resumo */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
            <Card titulo="Tokens (total)" valor={nf.format(d.totais.tokens)} icone="ti-coins" cor="#9B7DBF" />
            <Card titulo="Custo estimado" valor={usd(d.totais.custo)} icone="ti-cash" cor="#10b981" />
            <Card titulo="Chamadas" valor={nf.format(d.totais.chamadas)} icone="ti-arrows-exchange" cor="#5B8BA6" />
            <Card titulo="Sucesso" valor={pct(d.totais.sucesso, d.totais.chamadas)} sub={`${d.totais.erros} erro(s) · ${d.totais.rateLimit} limite`} icone="ti-circle-check" cor="#10b981" />
            <Card titulo="Áudio transcrito" valor={`${Math.round(d.totais.audioSeg / 60)} min`} icone="ti-microphone" cor="#C97064" />
          </div>

          {/* Tokens de chat Groq hoje (TPD) */}
          <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
              <h3 className="card-title" style={{ margin: 0 }}>Limite diário de chat (Groq)</h3>
              <span style={{ fontSize: 12, color: "var(--mk-text-secondary)" }}>
                <strong style={{ color: usoChatPct > 85 ? "#C97064" : "#10b981" }}>{nf.format(d.chatGroqHoje)}</strong> / {nf.format(d.limiteChatDia)} tokens hoje
              </span>
            </div>
            <div style={{ height: 10, borderRadius: 6, background: "var(--mk-surface-2)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${usoChatPct}%`, background: usoChatPct > 85 ? "#C97064" : "#10b981", transition: "width .3s" }} />
            </div>
            <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 6 }}>
              Resumo + Sentimento + Follow-up + Atendimento somam no teto de 100k/dia por chave Groq. Mais chaves Groq = mais limite (config em Configurações de API).
            </div>
          </div>

          {/* Gráfico por dia */}
          <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
            <h3 className="card-title" style={{ marginBottom: 12 }}>Tokens por dia</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
              {d.porDia.map((x) => (
                <div key={x.dia} title={`${x.dia}: ${nf.format(x.tokens)} tokens`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%" }}>
                  <div style={{ width: "100%", maxWidth: 26, height: `${Math.round((x.tokens / maxDia) * 100)}%`, minHeight: x.tokens ? 2 : 0, background: "linear-gradient(180deg,#9B7DBF,#5B8BA6)", borderRadius: "4px 4px 0 0" }} />
                  <span style={{ fontSize: 8.5, color: "var(--mk-text-muted)", marginTop: 3, whiteSpace: "nowrap" }}>{x.dia.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Por sessão */}
          <Tabela titulo="Por sessão" linhas={d.porSessao} totalTokens={d.totais.tokens} />

          {/* Provider + Usuário lado a lado */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }} className="em-grid">
            <Tabela titulo="Por provedor" linhas={d.porProvider} totalTokens={d.totais.tokens} />
            <Tabela titulo="Por usuário / atendente" linhas={d.porUsuario} totalTokens={d.totais.tokens} />
          </div>

          {/* Médias */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginTop: 14 }}>
            <Card titulo="Média por cliente" valor={`${nf.format(d.medias.porContato)} tok`} sub={`${d.medias.contatos} cliente(s)`} icone="ti-user" cor="#9B7DBF" />
            <Card titulo="Média por ticket" valor={`${nf.format(d.medias.porTicket)} tok`} sub={`${d.medias.tickets} ticket(s)`} icone="ti-ticket" cor="#5B8BA6" />
          </div>

          {/* Log */}
          <div className="mk-card mk-card-lg" style={{ marginTop: 14 }}>
            <h3 className="card-title" style={{ marginBottom: 12 }}>Log de uso ({d.log.length})</h3>
            <div className="chat-scroll" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 11.5 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--mk-text-muted)", fontSize: 10.5 }}>
                    <th style={th}>Data</th><th style={th}>Usuário</th><th style={th}>Sessão</th><th style={th}>Provedor</th><th style={th}>Modelo</th><th style={{ ...th, textAlign: "right" }}>Tokens</th><th style={{ ...th, textAlign: "right" }}>Custo</th><th style={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {d.log.map((l, i) => (
                    <tr key={i} style={{ borderTop: "0.5px solid var(--mk-border)" }}>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{new Date(l.data).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                      <td style={td}>{l.usuario}</td>
                      <td style={td}>{l.tarefa}</td>
                      <td style={td}>{l.provider}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 10.5 }}>{l.modelo}</td>
                      <td style={{ ...td, textAlign: "right", fontFamily: "monospace" }}>{nf.format(l.tokens)}</td>
                      <td style={{ ...td, textAlign: "right", fontFamily: "monospace" }}>{usd(l.custo)}</td>
                      <td style={td}>{l.status === "ok" ? <span style={{ color: "#10b981" }}>ok</span> : l.status === "rate_limit" ? <span style={{ color: "#C97064" }}>limite</span> : <span style={{ color: "#C97064" }}>erro</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Card({ titulo, valor, sub, icone, cor }: { titulo: string; valor: string; sub?: string; icone: string; cor: string }) {
  return (
    <div className="mk-card" style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: `${cor}22`, color: cor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}><i className={`ti ${icone}`} /></span>
        <span style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>{titulo}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--mk-text)" }}>{valor}</div>
      {sub && <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Tabela({ titulo, linhas, totalTokens }: { titulo: string; linhas: Array<{ chave: string; rotulo: string; tokens: number; custo: number; chamadas: number }>; totalTokens: number }) {
  return (
    <div className="mk-card mk-card-lg">
      <h3 className="card-title" style={{ marginBottom: 12 }}>{titulo}</h3>
      {linhas.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--mk-text-muted)", padding: 8 }}>Sem dados.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--mk-text-muted)", fontSize: 10.5 }}>
              <th style={th}>Item</th><th style={{ ...th, textAlign: "right" }}>Tokens</th><th style={{ ...th, textAlign: "right" }}>Custo</th><th style={{ ...th, textAlign: "right" }}>Chamadas</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.chave} style={{ borderTop: "0.5px solid var(--mk-border)" }}>
                <td style={td}>
                  {l.rotulo}
                  <div style={{ height: 4, borderRadius: 3, background: "var(--mk-surface-2)", marginTop: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${totalTokens ? Math.round((l.tokens / totalTokens) * 100) : 0}%`, background: "#9B7DBF" }} />
                  </div>
                </td>
                <td style={{ ...td, textAlign: "right", fontFamily: "monospace" }}>{nf.format(l.tokens)}</td>
                <td style={{ ...td, textAlign: "right", fontFamily: "monospace" }}>{usd(l.custo)}</td>
                <td style={{ ...td, textAlign: "right" }}>{nf.format(l.chamadas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: "6px 8px" };
const td: React.CSSProperties = { padding: "8px" };
