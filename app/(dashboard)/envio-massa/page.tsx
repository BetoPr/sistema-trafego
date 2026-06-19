import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { enviarTextoEmMassa } from "./_actions";

interface PageProps {
  searchParams: Promise<{ ok?: string; erro?: string; msg?: string; tab?: string }>;
}

const TABS = ["Texto", "Template (em breve)", "Variável (em breve)", "Relatório (em breve)"];

export default async function EnvioMassaPage({ searchParams }: PageProps) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const sb = createServiceClient();

  const { data: canais } = await sb
    .from("canais")
    .select("id, nome, status")
    .eq("agencia_id", ctx.agenciaId)
    .eq("status", "connected")
    .order("numero");

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Comunicação</div>
        <h1 className="mk-page-title">Envio em Massa</h1>
        <p className="mk-page-sub">Envie mensagens em lote. Use com responsabilidade — WhatsApp pode banir números que enviam spam.</p>
      </div>

      {sp.ok && <Banner tipo="ok">Envio disparado.</Banner>}
      {sp.erro && <Banner tipo="erro">{sp.erro} {sp.msg && `— ${decodeURIComponent(sp.msg)}`}</Banner>}

      <div className="mk-card mk-card-lg">
        <div style={{ display: "flex", gap: 16, borderBottom: "0.5px solid var(--mk-border)", marginBottom: 16 }}>
          {TABS.map((t, i) => (
            <div key={t} style={{ padding: "8px 4px", fontSize: 12, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? "var(--mk-text)" : "var(--mk-text-muted)", borderBottom: i === 0 ? "2px solid var(--mk-accent)" : "none" }}>
              {t}
            </div>
          ))}
        </div>

        <form action={enviarTextoEmMassa} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="em-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
            <div>
              <Label>Canal</Label>
              <select name="canal_id" required style={inp}>
                {(canais || []).length === 0 ? <option value="">Nenhum canal conectado</option> : null}
                {canais?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <Field label="Delay min (seg)" name="min_delay" type="number" defaultValue="20" />
            <Field label="Delay max (seg)" name="max_delay" type="number" defaultValue="45" />
          </div>

          <div>
            <Label>Mensagem (use [nome] como placeholder)</Label>
            <textarea name="mensagem" required rows={5} style={{ ...inp, fontFamily: "inherit", resize: "vertical" }} placeholder="Olá [nome]! Tudo bem? Aqui é o..." />
          </div>

          <div>
            <Label>Números (um por linha, formato 5511999999999)</Label>
            <textarea name="numeros" required rows={6} style={{ ...inp, fontFamily: "monospace", fontSize: 11.5, resize: "vertical" }} placeholder="5511999999999\n5527999999999" />
          </div>

          <div style={{ background: "rgba(201,112,100,0.12)", borderLeft: "3px solid #C97064", padding: "12px 14px", borderRadius: 6, fontSize: 11.5, color: "var(--mk-text-secondary)", lineHeight: 1.65 }}>
            <div style={{ fontWeight: 700, color: "#C97064", marginBottom: 4 }}>
              <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />
              Risco de bloqueio do número
            </div>
            Disparos em excesso ou com intervalo muito curto entre mensagens podem fazer o WhatsApp <strong>banir o número permanentemente</strong>. Quanto menor o delay e maior o volume, maior o risco.
            <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(16,185,129,0.12)", borderRadius: 6, border: "0.5px solid rgba(16,185,129,0.4)" }}>
              <strong style={{ color: "#10b981" }}><i className="ti ti-shield-check" style={{ marginRight: 4 }} />Configuração confortável:</strong> delay mín <strong>20s</strong> e máx <strong>45s</strong>, com lotes de até <strong>50 números por vez</strong> e pausa de ~30min entre lotes. Número novo (chip recém-ativado)? Comece com mín <strong>60s</strong> / máx <strong>120s</strong> e no máximo 20 contatos/dia na primeira semana.
            </div>
          </div>

          <div style={{ background: "rgba(16,185,129,0.15)", borderLeft: "3px solid #10b981", padding: 10, borderRadius: 6, fontSize: 11, color: "var(--mk-text-secondary)" }}>
            <i className="ti ti-alert-triangle" style={{ marginRight: 6, color: "#10b981" }} />
            MVP: envia direto via UAZAPI sem fila persistente. Para volumes grandes (1000+), aguarde Wave futura com BullMQ.
          </div>

          <button type="submit" className="cta-btn" disabled={!canais || canais.length === 0}>
            <i className="ti ti-send" /> Disparar envio
          </button>
        </form>
      </div>
    </section>
  );
}

function Banner({ tipo, children }: { tipo: "ok" | "erro"; children: React.ReactNode }) {
  const cor = tipo === "ok" ? "#10b981" : "#C97064";
  return <div style={{ background: tipo === "ok" ? "rgba(16,185,129,0.12)" : "rgba(201,112,100,0.12)", borderLeft: `3px solid ${cor}`, padding: "10px 14px", borderRadius: 8, fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 14 }}><i className={`ti ${tipo === "ok" ? "ti-circle-check" : "ti-alert-triangle"}`} style={{ marginRight: 8, color: cor }} />{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) { return <label style={{ display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" }}>{children}</label>; }
function Field({ label, name, defaultValue, type = "text" }: { label: string; name: string; defaultValue?: string; type?: string }) {
  return <div><Label>{label}</Label><input type={type} name={name} defaultValue={defaultValue} style={inp} /></div>;
}
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
