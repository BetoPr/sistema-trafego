import Link from "next/link";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { testarGroq } from "./_actions";
import { TranscricaoCard } from "./_transcricao";
import { ChavesManager, type ChaveItem } from "./_chaves";
import { ProviderCard } from "./_provider";

interface PageProps {
  searchParams: Promise<{ ok?: string; erro?: string; msg?: string }>;
}

const OK_MSG: Record<string, string> = {
  salvo: "Salvo.",
  teste: "Teste OK!",
  chave_add: "Chave adicionada.",
  chave_rm: "Chave removida.",
  provider: "Preferência de provider salva.",
  openai_tudo: "Agora tudo usa OpenAI.",
  groq_tudo: "Tudo voltou pro Groq.",
};

export default async function IAConfigPage({ searchParams }: PageProps) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const sb = createServiceClient();

  const [{ data: cfg }, { data: chavesRows }] = await Promise.all([
    sb
      .from("configuracoes_agencia")
      .select("ia")
      .eq("agencia_id", ctx.agenciaId)
      .maybeSingle(),
    sb
      .from("ia_chaves")
      .select("id, provider, rotulo, criado_em, ordem")
      .eq("agencia_id", ctx.agenciaId)
      .eq("ativa", true)
      .order("provider", { ascending: true })
      .order("ordem", { ascending: true }),
  ]);

  const porProvider = (p: string): ChaveItem[] =>
    (chavesRows || []).filter((c) => c.provider === p).map((c) => ({ id: c.id as string, rotulo: c.rotulo as string | null, criado_em: c.criado_em as string }));
  const groq = porProvider("groq");
  const openai = porProvider("openai");
  const anthropic = porProvider("anthropic");

  const ia = (cfg?.ia as Record<string, unknown> | null) ?? {};
  const providerChat = ia.provider_chat === "openai" ? "openai" : "groq";
  const providerTranscricao = ia.provider_transcricao === "openai" ? "openai" : "groq";
  const t = (ia.transcricao ?? {}) as { ativa?: boolean; idioma?: string };
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
          Chaves de IA num lugar só, com <strong>rotação automática</strong> (várias chaves Groq = mais tokens/dia) e
          <strong> fallback pro OpenAI</strong> quando o Groq estourar o limite. Tudo criptografado at-rest (AES-256-GCM).
        </p>
      </div>

      {sp.ok && (
        <div style={banner("ok")}>
          <i className="ti ti-circle-check" style={{ marginRight: 8, color: "#10b981" }} />
          {OK_MSG[sp.ok] || "OK."}
          {sp.msg && <div style={{ marginTop: 4, fontSize: 11, fontFamily: "monospace" }}>{decodeURIComponent(sp.msg)}</div>}
        </div>
      )}
      {sp.erro && (
        <div style={banner("erro")}>
          <i className="ti ti-alert-triangle" style={{ marginRight: 8, color: "#C97064" }} />
          {sp.erro === "sem_chave" ? "Configure uma chave Groq primeiro." : sp.erro === "teste_falhou" ? "Teste falhou." : sp.erro}
          {sp.msg && <div style={{ marginTop: 4, fontSize: 11, fontFamily: "monospace" }}>{decodeURIComponent(sp.msg)}</div>}
        </div>
      )}

      {/* Preferência de provider */}
      <ProviderCard providerChat={providerChat} providerTranscricao={providerTranscricao} temOpenai={openai.length > 0} />

      {/* GROQ — rotação */}
      <ChavesManager
        provider="groq"
        titulo="Groq"
        emoji="⚡"
        cor="#F55036"
        placeholder="gsk_..."
        chaves={groq}
        rotacao
        ajuda={
          <>
            <strong>Como obter:</strong>
            <ol style={{ paddingLeft: 18, marginTop: 4 }}>
              <li>Acesse <a href="https://console.groq.com" target="_blank" rel="noreferrer" style={{ color: "var(--mk-accent)" }}>console.groq.com</a> (free)</li>
              <li>Menu → <strong>API Keys</strong> → <strong>Create API Key</strong></li>
              <li>Copia (<code>gsk_</code>) e cola acima. Pra mais tokens/dia, crie chaves em contas diferentes e adicione todas.</li>
            </ol>
            <TestarGroqBtn temGroq={groq.length > 0} />
          </>
        }
      />

      {/* Transcrição — toggle ativa/idioma */}
      <TranscricaoCard inicial={transcricaoInicial} />

      {/* OPENAI — alternativa / fallback */}
      <ChavesManager
        provider="openai"
        titulo="OpenAI"
        emoji="🤖"
        placeholder="sk-..."
        chaves={openai}
        rotacao
        ajuda={
          <>
            Usado como alternativa ou <strong>fallback automático</strong> do Groq. Modelos: chat <code>gpt-4o-mini</code>,
            transcrição <code>gpt-4o-transcribe</code>. Chave em{" "}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{ color: "var(--mk-accent)" }}>platform.openai.com</a>.
          </>
        }
      />

      {/* ANTHROPIC — opcional */}
      <ChavesManager
        provider="anthropic"
        titulo="Anthropic Claude"
        emoji="🧠"
        placeholder="sk-ant-..."
        chaves={anthropic}
        ajuda={<>Opcional. Ainda não entra na rotação de chat/transcrição — guardada pra uso futuro.</>}
      />
    </section>
  );
}

function TestarGroqBtn({ temGroq }: { temGroq: boolean }) {
  if (!temGroq) return null;
  return (
    <form action={testarGroq} style={{ marginTop: 10 }}>
      <button type="submit" className="ghost-btn" style={{ fontSize: 11 }}>
        <i className="ti ti-plug-connected" /> Testar conectividade Groq
      </button>
    </form>
  );
}

function banner(t: "ok" | "erro"): React.CSSProperties {
  const cor = t === "ok" ? "#10b981" : "#C97064";
  return { background: t === "ok" ? "rgba(16,185,129,0.12)" : "rgba(201,112,100,0.12)", borderLeft: `3px solid ${cor}`, padding: "10px 14px", borderRadius: 8, fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 14 };
}
