import Link from "next/link";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { salvarConfigAsaas } from "./_actions";

interface PageProps {
  searchParams: Promise<{ ok?: string; erro?: string; msg?: string }>;
}

export default async function AsaasConfigPage({ searchParams }: PageProps) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const sb = createServiceClient();

  const { data: cfg } = await sb
    .from("asaas_config")
    .select("api_key_encrypted, ambiente, pix_tipo_chave, pix_chave, pix_nome_recebedor, pix_mensagem_padrao, mensagem_pagamento_auto, webhook_secret, ativo")
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/webhooks/asaas`;

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <Link href="/configuracoes" style={{ fontSize: 12, color: "var(--mk-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
          <i className="ti ti-arrow-left" /> Voltar
        </Link>
        <div className="mk-eyebrow">Configuração · Pagamentos</div>
        <h1 className="mk-page-title">Asaas</h1>
        <p className="mk-page-sub">Configure Asaas para emitir PIX e links de cartão direto pelo chat.</p>
      </div>

      {sp.ok && <Banner tipo="ok">Configuração salva.</Banner>}
      {sp.erro && <Banner tipo="erro">{sp.erro}</Banner>}

      <div className="mk-card mk-card-lg">
        <form action={salvarConfigAsaas} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field
            label="API Key"
            name="api_key"
            type="password"
            defaultValue={cfg?.api_key_encrypted ? "•••GUARDADO•••" : ""}
            placeholder={cfg?.api_key_encrypted ? "Deixe •••GUARDADO••• pra manter" : "Cole sua API Key Asaas"}
            required={!cfg}
          />

          <div style={grid2}>
            <div>
              <Label>Ambiente</Label>
              <select name="ambiente" defaultValue={cfg?.ambiente ?? "producao"} style={inp}>
                <option value="producao">Produção</option>
                <option value="sandbox">Sandbox</option>
              </select>
            </div>
            <div>
              <Label>Ativo</Label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0" }}>
                <input type="checkbox" name="ativo" defaultChecked={cfg?.ativo ?? false} />
                <span style={{ fontSize: 12, color: "var(--mk-text-secondary)" }}>Habilitar Asaas</span>
              </label>
            </div>
          </div>

          <div style={{ borderTop: "0.5px solid var(--mk-border)", paddingTop: 14 }}>
            <h4 style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>Configuração padrão PIX</h4>
            <div style={grid2}>
              <div>
                <Label>Tipo de chave</Label>
                <select name="pix_tipo_chave" defaultValue={cfg?.pix_tipo_chave ?? "EVP"} style={inp}>
                  <option value="EVP">EVP (aleatória)</option>
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="EMAIL">Email</option>
                  <option value="PHONE">Telefone</option>
                </select>
              </div>
              <Field label="Chave PIX" name="pix_chave" defaultValue={cfg?.pix_chave ?? ""} placeholder="sua@chave.com" />
            </div>
            <div style={grid2}>
              <Field label="Nome do recebedor" name="pix_nome_recebedor" defaultValue={cfg?.pix_nome_recebedor ?? ""} placeholder="Sua Empresa Ltda" />
              <Field label="Mensagem padrão" name="pix_mensagem_padrao" defaultValue={cfg?.pix_mensagem_padrao ?? ""} placeholder="Pagamento referente a..." />
            </div>
          </div>

          <div style={{ borderTop: "0.5px solid var(--mk-border)", paddingTop: 14 }}>
            <Field
              label="Mensagem auto pós-pagamento"
              name="mensagem_pagamento_auto"
              defaultValue={cfg?.mensagem_pagamento_auto ?? "Recebi seu pagamento! 😊 Em breve daremos sequência."}
            />
          </div>

          <div style={{ background: "rgba(91,139,166,0.10)", borderLeft: "3px solid #5B8BA6", padding: 12, borderRadius: 6, fontSize: 11.5, color: "var(--mk-text-secondary)", lineHeight: 1.6 }}>
            <strong>Webhook Asaas:</strong> cadastre na sua conta Asaas em <em>Integrações &gt; Webhook</em>:
            <div style={{ marginTop: 6, padding: 8, background: "var(--mk-surface-2)", borderRadius: 4, fontFamily: "monospace", fontSize: 11, wordBreak: "break-all" }}>{webhookUrl}</div>
            <div style={{ marginTop: 6 }}>
              No campo <strong>Auth Token</strong> do webhook (Asaas v3) cole:
              <div style={{ marginTop: 4, padding: 8, background: "var(--mk-surface-2)", borderRadius: 4, fontFamily: "monospace", fontSize: 11 }}>{cfg?.webhook_secret || "(salve primeiro pra gerar)"}</div>
            </div>
          </div>

          <button type="submit" className="cta-btn"><i className="ti ti-device-floppy" /> Salvar configuração</button>
        </form>
      </div>
    </section>
  );
}

function Banner({ tipo, children }: { tipo: "ok" | "erro"; children: React.ReactNode }) {
  const cor = tipo === "ok" ? "#6B8E4E" : "#C97064";
  return <div style={{ background: tipo === "ok" ? "rgba(107,142,78,0.12)" : "rgba(201,112,100,0.12)", borderLeft: `3px solid ${cor}`, padding: "10px 14px", borderRadius: 8, fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 14 }}><i className={`ti ${tipo === "ok" ? "ti-circle-check" : "ti-alert-triangle"}`} style={{ marginRight: 8, color: cor }} />{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) { return <label style={{ display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" }}>{children}</label>; }
function Field({ label, name, defaultValue, placeholder, type = "text", required }: { label: string; name: string; defaultValue?: string; placeholder?: string; type?: string; required?: boolean }) {
  return <div><Label>{label}</Label><input type={type} name={name} defaultValue={defaultValue} placeholder={placeholder} required={required} style={inp} /></div>;
}
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
