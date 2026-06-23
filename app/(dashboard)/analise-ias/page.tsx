import { requireAdmin } from "@/lib/crm/permissions";
import { agregarUso } from "@/lib/ai/relatorio";
import { Controles } from "./_controles";
import { ExportarUso } from "./_exportar";
import { CountUp } from "@/components/ui/CountUp";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ provider?: string; dias?: string; escopo?: string }>;
}

const nf = new Intl.NumberFormat("pt-BR");
const usd = (n: number) => "$" + (n < 1 ? n.toFixed(4) : n.toFixed(2));
const pct = (parte: number, total: number) => (total ? `${Math.round((parte / total) * 100)}%` : "—");

export default async function AnaliseIAsPage({ searchParams }: PageProps) {
  const ctx = await requireAdmin();
  const superAdmin = ctx.role === "super_admin";
  const sp = await searchParams;
  const provider = ["groq", "openai", "anthropic"].includes(sp.provider || "") ? sp.provider! : "todos";
  const dias = [1, 7, 30].includes(Number(sp.dias)) ? Number(sp.dias) : 7;
  const escopo = (superAdmin && (sp.escopo === "todos" || sp.escopo === "tipo")) ? sp.escopo : "meu";

  let d;
  try {
    d = await agregarUso({ provider, dias, escopo, agenciaId: ctx.agenciaId, superAdmin });
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack?.split("\n").slice(0, 5).join("\n")}` : String(e);
    console.error("[analise-ias] agregarUso falhou:", msg);
    throw new Error(`Falha ao agregar uso de IA: ${msg}`);
  }
  const maxDia = Math.max(1, ...d.porDia.map((x) => x.tokens));
  const usoChatPct = Math.min(100, Math.round((d.chatGroqHoje / Math.max(1, d.limiteChatDia)) * 100));

  return (
    <section className="mk-page">
      <div className="mk-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mk-eyebrow">Configuração · IA</div>
          <h1 className="mk-page-title">Análise de IAs</h1>
          <p className="mk-page-sub">Uso de tokens, custo e desempenho — por sessão, provedor, admin{superAdmin ? ", cliente e tipo de cliente" : ""}.</p>
        </div>
        <ExportarUso provider={provider} dias={dias} escopo={escopo} log={d.log} crossCliente={escopo !== "meu"} />
      </div>

      <Controles provider={provider} dias={dias} escopo={escopo} superAdmin={superAdmin} />

      {d.totais.chamadas === 0 ? (
        <div className="mk-card mk-card-lg" style={{ textAlign: "center", padding: 40, color: "var(--mk-text-muted)", fontSize: 13 }}>
          <i className="ti ti-chart-bar" style={{ fontSize: 30, display: "block", marginBottom: 8, opacity: 0.6 }} />
          Nenhum uso de IA registrado nesse período/provedor ainda. Use Follow-up, resumo ou transcrição que os dados aparecem aqui.
        </div>
      ) : (
        <>
          {/* KPIs com delta vs período anterior */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
            <Card titulo="Tokens (total)" valor={<CountUp value={d.totais.tokens} />} delta={d.delta.tokens} icone="ti-coins" cor="#00E19A" />
            <Card titulo="Custo estimado" valor={<CountUp value={d.totais.custo} format={(n) => usd(n)} />} delta={d.delta.custo} icone="ti-cash" cor="#00E19A" />
            <Card titulo="Chamadas" valor={<CountUp value={d.totais.chamadas} />} delta={d.delta.chamadas} icone="ti-arrows-exchange" cor="#5B8BA6" />
            <Card titulo="Sucesso" valor={<CountUp value={d.totais.chamadas > 0 ? Math.round((d.totais.sucesso / d.totais.chamadas) * 100) : 0} suffix="%" />} sub={`${d.totais.erros} erro(s) · ${d.totais.rateLimit} limite`} icone="ti-circle-check" cor="#00E19A" />
            <Card titulo="Áudio transcrito" valor={<CountUp value={Math.round(d.totais.audioSeg / 60)} suffix=" min" />} icone="ti-microphone" cor="#C97064" />
          </div>

          {/* Médias + eficiência */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10, marginBottom: 14 }}>
            <Card titulo="Média por conversa" valor={<CountUp value={d.medias.porConversa} suffix=" tok" />} sub={`${usd(d.medias.custoPorConversa)} · ${d.medias.contatos} conversa(s)`} icone="ti-message-circle" cor="#00E19A" />
            <Card titulo="Média por ticket" valor={<CountUp value={d.medias.porTicket} suffix=" tok" />} sub={`${d.medias.tickets} ticket(s)`} icone="ti-ticket" cor="#5B8BA6" />
            <Card titulo="Média por chamada" valor={<CountUp value={d.medias.porRequest} suffix=" tok" />} icone="ti-arrow-bar-right" cor="#C97064" />
            <Card titulo="Prompt × Resposta" valor={`${d.eficiencia.promptPct}% / ${d.eficiencia.completionPct}%`} sub="entrada / saída" icone="ti-arrows-split" cor="#00E19A" />
          </div>

          {/* Limite diário de chat (Groq) */}
          <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
              <h3 className="card-title" style={{ margin: 0 }}>Limite diário de chat (Groq)</h3>
              <span style={{ fontSize: 12, color: "var(--mk-text-secondary)" }}>
                <strong style={{ color: usoChatPct > 85 ? "#C97064" : "#00E19A" }}>{nf.format(d.chatGroqHoje)}</strong> / {nf.format(d.limiteChatDia)} tokens hoje
              </span>
            </div>
            <div style={{ height: 10, borderRadius: 6, background: "var(--mk-surface-2)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${usoChatPct}%`, background: usoChatPct > 85 ? "#C97064" : "#00E19A", transition: "width .3s" }} />
            </div>
            <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 6 }}>Resumo + Sentimento + Follow-up + Atendimento somam no teto de 100k/dia por chave Groq. Mais chaves = mais limite.</div>
          </div>

          {/* Gráfico por dia */}
          <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
            <h3 className="card-title" style={{ marginBottom: 12 }}>Tokens por dia</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
              {d.porDia.map((x) => (
                <div key={x.dia} title={`${x.dia}: ${nf.format(x.tokens)} tokens`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%" }}>
                  <div style={{ width: "100%", maxWidth: 26, height: `${Math.round((x.tokens / maxDia) * 100)}%`, minHeight: x.tokens ? 2 : 0, background: "linear-gradient(180deg,#00E19A,#0d9488)", borderRadius: "4px 4px 0 0" }} />
                  <span style={{ fontSize: 8.5, color: "var(--mk-text-muted)", marginTop: 3, whiteSpace: "nowrap" }}>{x.dia.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>

          <Tabela titulo="Por sessão" linhas={d.porSessao} total={d.totais.tokens} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }} className="em-grid">
            <Tabela titulo="Por modelo" linhas={d.porModelo} total={d.totais.tokens} />
            <Tabela titulo="Por provedor" linhas={d.porProvider} total={d.totais.tokens} />
          </div>

          {/* Por admin + (super-admin) cliente/tipo */}
          <div style={{ display: "grid", gridTemplateColumns: escopo === "meu" ? "1fr" : "1fr 1fr", gap: 14, marginTop: 14 }} className="em-grid">
            <Tabela titulo="Por Admin / usuário" linhas={d.porUsuario} total={d.totais.tokens} />
            {escopo === "todos" && <Tabela titulo="Por cliente (agência)" linhas={d.porCliente} total={d.totais.tokens} />}
            {escopo === "tipo" && <Tabela titulo="Por tipo de cliente" linhas={d.porTipoCliente} total={d.totais.tokens} />}
          </div>

          {/* Log */}
          <div className="mk-card mk-card-lg" style={{ marginTop: 14 }}>
            <h3 className="card-title" style={{ marginBottom: 12 }}>Log de uso ({d.log.length})</h3>
            <div className="chat-scroll" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 11.5 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--mk-text-muted)", fontSize: 10.5 }}>
                    <th style={th}>Data</th><th style={th}>Admin</th>{escopo !== "meu" && <th style={th}>Cliente</th>}<th style={th}>Sessão</th><th style={th}>Provedor</th><th style={th}>Modelo</th><th style={{ ...th, textAlign: "right" }}>Tokens</th><th style={{ ...th, textAlign: "right" }}>Custo</th><th style={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {d.log.map((l, i) => (
                    <tr key={i} style={{ borderTop: "0.5px solid var(--mk-border)" }}>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{new Date(l.data).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                      <td style={td}>{l.usuario}</td>
                      {escopo !== "meu" && <td style={td}>{l.cliente}</td>}
                      <td style={td}>{l.tarefa}</td>
                      <td style={td}>{l.provider}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 10.5 }}>{l.modelo}</td>
                      <td style={{ ...td, textAlign: "right", fontFamily: "monospace" }}>{nf.format(l.tokens)}</td>
                      <td style={{ ...td, textAlign: "right", fontFamily: "monospace" }}>{usd(l.custo)}</td>
                      <td style={td}>{l.status === "ok" ? <span style={{ color: "#00E19A" }}>ok</span> : <span style={{ color: "#C97064" }}>{l.status === "rate_limit" ? "limite" : "erro"}</span>}</td>
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

function Card({ titulo, valor, sub, delta, icone, cor }: { titulo: string; valor: React.ReactNode; sub?: string; delta?: number; icone: string; cor: string }) {
  return (
    <div className="mk-card" style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: `${cor}22`, color: cor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}><i className={`ti ${icone}`} /></span>
        <span style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>{titulo}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--mk-text)" }}>{valor}</div>
        {typeof delta === "number" && (
          <span style={{ fontSize: 10.5, fontWeight: 600, color: delta > 0 ? "#C97064" : delta < 0 ? "#00E19A" : "var(--mk-text-muted)" }}>
            <i className={`ti ti-arrow-${delta > 0 ? "up" : delta < 0 ? "down" : "right"}`} /> {Math.abs(delta)}%
          </span>
        )}
      </div>
      {sub && <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Tabela({ titulo, linhas, total }: { titulo: string; linhas: Array<{ chave: string; rotulo: string; tokens: number; custo: number; chamadas: number }>; total: number }) {
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
                    <div style={{ height: "100%", width: `${total ? Math.round((l.tokens / total) * 100) : 0}%`, background: "#00E19A" }} />
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
