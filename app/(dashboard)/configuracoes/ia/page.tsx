import Link from "next/link";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { salvarChavesIA, testarGroq } from "./_actions";
import { TranscricaoCard } from "./_transcricao";

interface PageProps {
  searchParams: Promise<{ ok?: string; erro?: string; msg?: string }>;
}

export default async function IAConfigPage({ searchParams }: PageProps) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const sb = createServiceClient();

  const { data: cfg } = await sb
    .from("configuracoes_agencia")
    .select("groq_key_encrypted, openai_key_encrypted, anthropic_key_encrypted, ia")
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();

  const temGroq = !!cfg?.groq_key_encrypted;
  const temOpenai = !!cfg?.openai_key_encrypted;
  const temAnthropic = !!cfg?.anthropic_key_encrypted;
  const t = ((cfg?.ia as Record<string, unknown> | null)?.transcricao ?? {}) as { ativa?: boolean; idioma?: string };
  const transcricaoInicial = { ativa: t.ativa !== false, idioma: t.idioma || "pt" };

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <Link href="/configuracoes" style={{ fontSize: 12, color: "var(--mk-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
          <i className="ti ti-arrow-left" /> Voltar
        </Link>
        <div className="mk-eyebrow">Configuração · IA</div>
        <h1 className="mk-page-title">Configurações de API (IA)</h1>
        <p className="mk-page-sub">
          Todas as chaves de API de IA num lugar só. Com <strong>uma única chave Groq</strong> o sistema
          transcreve áudio (Whisper Large v3) e faz resumo + análise (Llama 3.3 70B). As chaves ficam
          criptografadas at-rest (AES-256-GCM).
        </p>
      </div>

      {sp.ok && (
        <div style={banner("ok")}>
          <i className="ti ti-circle-check" style={{ marginRight: 8, color: "#10b981" }} />
          {sp.ok === "salvo" ? "Chaves salvas." : sp.ok === "teste" ? "Teste OK!" : "OK."}
          {sp.msg && <div style={{ marginTop: 4, fontSize: 11, fontFamily: "monospace" }}>{decodeURIComponent(sp.msg)}</div>}
        </div>
      )}
      {sp.erro && (
        <div style={banner("erro")}>
          <i className="ti ti-alert-triangle" style={{ marginRight: 8, color: "#C97064" }} />
          {sp.erro === "sem_chave" ? "Configure a chave Groq primeiro." : sp.erro === "teste_falhou" ? "Teste falhou." : sp.erro}
          {sp.msg && <div style={{ marginTop: 4, fontSize: 11, fontFamily: "monospace" }}>{decodeURIComponent(sp.msg)}</div>}
        </div>
      )}

      {/* GROQ — principal */}
      <div className="mk-card mk-card-lg" style={{ marginBottom: 14, borderLeft: "3px solid #F55036" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <h3 className="card-title">⚡ Groq (recomendado)</h3>
          <span className={`mk-badge ${temGroq ? "b-green" : "b-gray"}`} style={{ marginLeft: "auto", fontSize: 10 }}>
            {temGroq ? "● Configurada" : "○ Não configurada"}
          </span>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
          Tem <strong>plano gratuito generoso</strong>. Usada por padrão pra:
          <br />• Transcrição de áudio (Whisper Large v3)
          <br />• Resumo de conversa (Llama 3.3 70B)
          <br />• Análise de sentimento (Llama 3.3 70B)
        </p>

        <form action={salvarChavesIA} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <Label>API Key Groq</Label>
            <input
              type="password"
              name="groq_key"
              defaultValue={temGroq ? "•••GUARDADO•••" : ""}
              placeholder={temGroq ? "Deixe •••GUARDADO••• pra manter, ou cole nova" : "gsk_..."}
              style={inp}
              required={!temGroq}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="cta-btn">
              <i className="ti ti-device-floppy" /> Salvar
            </button>
          </div>
        </form>

        {temGroq && (
          <form action={testarGroq} style={{ marginTop: 10 }}>
            <button type="submit" className="ghost-btn" style={{ fontSize: 11 }}>
              <i className="ti ti-plug-connected" /> Testar conectividade
            </button>
          </form>
        )}

        <div style={{ marginTop: 12, padding: 10, background: "var(--mk-surface-2)", borderRadius: 6, fontSize: 11, color: "var(--mk-text-secondary)", lineHeight: 1.6 }}>
          <strong>Como obter:</strong>
          <ol style={{ paddingLeft: 18, marginTop: 4 }}>
            <li>Acesse <a href="https://console.groq.com" target="_blank" rel="noreferrer" style={{ color: "var(--mk-accent)" }}>console.groq.com</a></li>
            <li>Cria conta (free)</li>
            <li>Menu lateral → <strong>API Keys</strong> → <strong>Create API Key</strong></li>
            <li>Copia (começa com <code>gsk_</code>) e cola acima</li>
          </ol>
        </div>
      </div>

      {/* Transcrição — usa a MESMA chave Groq acima (1 chave faz tudo) */}
      <TranscricaoCard inicial={transcricaoInicial} />

      {/* OpenAI */}
      <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <h3 className="card-title">🤖 OpenAI (opcional)</h3>
          <span className={`mk-badge ${temOpenai ? "b-green" : "b-gray"}`} style={{ marginLeft: "auto", fontSize: 10 }}>
            {temOpenai ? "● Configurada" : "○ Não configurada"}
          </span>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 12 }}>
          Use se preferir ChatGPT pra resumo/sentimento. Configure modelo em <Link href="/configuracoes/ia-prompts" style={{ color: "var(--mk-accent)" }}>Prompts IA</Link>.
        </p>
        <form action={salvarChavesIA} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="API Key OpenAI" name="openai_key" type="password" defaultValue={temOpenai ? "•••GUARDADO•••" : ""} placeholder="sk-..." />
          <button type="submit" className="cta-btn" style={{ fontSize: 12 }}>
            <i className="ti ti-device-floppy" /> Salvar
          </button>
        </form>
      </div>

      {/* Anthropic */}
      <div className="mk-card mk-card-lg">
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <h3 className="card-title">🧠 Anthropic Claude (opcional)</h3>
          <span className={`mk-badge ${temAnthropic ? "b-green" : "b-gray"}`} style={{ marginLeft: "auto", fontSize: 10 }}>
            {temAnthropic ? "● Configurada" : "○ Não configurada"}
          </span>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 12 }}>
          Use Claude se preferir. Modelo configurável em Prompts IA.
        </p>
        <form action={salvarChavesIA} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="API Key Anthropic" name="anthropic_key" type="password" defaultValue={temAnthropic ? "•••GUARDADO•••" : ""} placeholder="sk-ant-..." />
          <button type="submit" className="cta-btn" style={{ fontSize: 12 }}>
            <i className="ti ti-device-floppy" /> Salvar
          </button>
        </form>
      </div>
    </section>
  );
}

function banner(t: "ok" | "erro"): React.CSSProperties {
  const cor = t === "ok" ? "#10b981" : "#C97064";
  return { background: t === "ok" ? "rgba(16,185,129,0.12)" : "rgba(201,112,100,0.12)", borderLeft: `3px solid ${cor}`, padding: "10px 14px", borderRadius: 8, fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 14 };
}
function Label({ children }: { children: React.ReactNode }) { return <label style={{ display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" }}>{children}</label>; }
function Field({ label, name, defaultValue, placeholder, type = "text" }: { label: string; name: string; defaultValue?: string; placeholder?: string; type?: string }) {
  return <div><Label>{label}</Label><input type={type} name={name} defaultValue={defaultValue} placeholder={placeholder} style={inp} /></div>;
}
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5, fontFamily: "monospace" };
