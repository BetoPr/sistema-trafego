import Link from "next/link";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { criarWebhook, alternarAtivo, deletarWebhook, testarWebhook } from "./_actions";

const EVENTOS = [
  "mensagem.recebida",
  "mensagem.enviada",
  "ticket.criado",
  "ticket.fechado",
  "pagamento.recebido",
  "contato.criado",
  "etiqueta.adicionada",
] as const;

interface PageProps {
  searchParams: Promise<{ ok?: string; erro?: string; msg?: string }>;
}

export default async function WebhooksPage({ searchParams }: PageProps) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const sb = createServiceClient();

  const { data: webhooks } = await sb
    .from("webhooks_out")
    .select("id, nome, url, eventos, secret, ativo, created_at")
    .eq("agencia_id", ctx.agenciaId)
    .order("created_at", { ascending: false });

  const { data: logs } = await sb
    .from("webhooks_out_logs")
    .select("evento, status_code, erro, tentativa, enviado_em, webhook_id")
    .eq("agencia_id", ctx.agenciaId)
    .order("enviado_em", { ascending: false })
    .limit(20);

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <Link href="/configuracoes" style={{ fontSize: 12, color: "var(--mk-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}><i className="ti ti-arrow-left" /> Voltar</Link>
        <div className="mk-eyebrow">Configuração · Integrações</div>
        <h1 className="mk-page-title">Webhooks (OUT)</h1>
        <p className="mk-page-sub">Sistema → URL externa. Para integrações n8n, Make, Zapier. HMAC-SHA256 assinado no header <code>x-sistema-trafego-signature</code>.</p>
      </div>

      {sp.ok && <div style={banner("ok")}><i className="ti ti-circle-check" /> {sp.ok === "teste" ? `Teste disparado. ${sp.msg ? decodeURIComponent(sp.msg) : ""}` : "OK."}</div>}
      {sp.erro && <div style={banner("erro")}><i className="ti ti-alert-triangle" /> {sp.erro} {sp.msg && `— ${decodeURIComponent(sp.msg)}`}</div>}

      <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
        <h3 className="card-title" style={{ marginBottom: 14 }}>Novo webhook</h3>
        <form action={criarWebhook} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Nome" name="nome" placeholder="n8n produção" />
          <Field label="URL" name="url" placeholder="https://n8n.exemplo.com/webhook/abc" />
          <div>
            <label style={{ fontSize: 11, color: "var(--mk-text-muted)", display: "block", marginBottom: 6, fontFamily: "monospace" }}>Eventos</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
              {EVENTOS.map((e) => (
                <label key={e} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11.5, color: "var(--mk-text-secondary)", padding: "6px 8px", borderRadius: 6, border: "0.5px solid var(--mk-border)" }}>
                  <input type="checkbox" name={`ev_${e}`} /> <code>{e}</code>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="cta-btn"><i className="ti ti-plus" /> Criar webhook</button>
        </form>
      </div>

      <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
        <h3 className="card-title" style={{ marginBottom: 14 }}>Configurados ({webhooks?.length || 0})</h3>
        {!webhooks || webhooks.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>Sem webhooks.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {webhooks.map((w) => (
              <div key={w.id} style={{ padding: "12px 14px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface)", opacity: w.ativo ? 1 : 0.6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{w.nome}</div>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--mk-text-muted)", wordBreak: "break-all" }}>{w.url}</div>
                  </div>
                  <span className={`mk-badge ${w.ativo ? "b-green" : "b-gray"}`}>{w.ativo ? "● Ativo" : "○ Inativo"}</span>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                  {(w.eventos as string[] || []).map((e) => <code key={e} style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "rgba(155,125,191,0.18)", color: "#9B7DBF" }}>{e}</code>)}
                </div>
                <div style={{ fontSize: 10, color: "var(--mk-text-muted)", fontFamily: "monospace", marginBottom: 8 }}>secret: {w.secret}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <form action={testarWebhook} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={w.id} />
                    <button type="submit" className="ghost-btn" style={{ fontSize: 11 }}><i className="ti ti-send" /> Testar</button>
                  </form>
                  <form action={alternarAtivo} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={w.id} />
                    <input type="hidden" name="ativo" value={String(w.ativo)} />
                    <button type="submit" className="ghost-btn" style={{ fontSize: 11 }}><i className={`ti ${w.ativo ? "ti-toggle-right" : "ti-toggle-left"}`} /></button>
                  </form>
                  <form action={deletarWebhook} style={{ display: "inline", marginLeft: "auto" }}>
                    <input type="hidden" name="id" value={w.id} />
                    <button type="submit" className="ghost-btn" style={{ fontSize: 11, color: "#C97064" }}><i className="ti ti-trash" /></button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mk-card mk-card-lg">
        <h3 className="card-title" style={{ marginBottom: 14 }}>Últimos disparos ({logs?.length || 0})</h3>
        {!logs || logs.length === 0 ? (
          <div style={{ padding: 14, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12 }}>Sem disparos ainda.</div>
        ) : (
          <table style={{ width: "100%", fontSize: 11.5 }}>
            <thead>
              <tr style={{ color: "var(--mk-text-muted)", fontSize: 10.5 }}>
                <th style={{ padding: 6, textAlign: "left" }}>Data</th>
                <th style={{ padding: 6, textAlign: "left" }}>Evento</th>
                <th style={{ padding: 6, textAlign: "left" }}>Status</th>
                <th style={{ padding: 6, textAlign: "left" }}>Tentativa</th>
                <th style={{ padding: 6, textAlign: "left" }}>Erro</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={i} style={{ borderTop: "0.5px solid var(--mk-border)" }}>
                  <td style={{ padding: 6, fontSize: 11 }}>{new Date(l.enviado_em).toLocaleString("pt-BR")}</td>
                  <td style={{ padding: 6 }}><code style={{ fontSize: 10 }}>{l.evento}</code></td>
                  <td style={{ padding: 6 }}>{l.status_code ? <span style={{ color: l.status_code < 300 ? "#10b981" : "#C97064" }}>{l.status_code}</span> : "—"}</td>
                  <td style={{ padding: 6 }}>{l.tentativa}</td>
                  <td style={{ padding: 6, fontSize: 10, color: "#C97064" }}>{l.erro?.slice(0, 80) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function banner(t: "ok" | "erro"): React.CSSProperties {
  const cor = t === "ok" ? "#10b981" : "#C97064";
  return { background: t === "ok" ? "rgba(16,185,129,0.12)" : "rgba(201,112,100,0.12)", borderLeft: `3px solid ${cor}`, padding: "10px 14px", borderRadius: 8, fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 14 };
}
function Field({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return <div><label style={{ display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" }}>{label}</label><input type="text" name={name} placeholder={placeholder} required style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 }} /></div>;
}
