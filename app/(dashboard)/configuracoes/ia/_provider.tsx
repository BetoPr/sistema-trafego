"use client";

import { definirProviderIA, usarOpenaiEmTudo, voltarParaGroq } from "./_actions";

type Prov = "groq" | "openai";

function pill(on: boolean): React.CSSProperties {
  return {
    padding: "7px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
    border: `1px solid ${on ? "var(--mk-accent)" : "var(--mk-border)"}`,
    background: on ? "rgba(16,185,129,0.16)" : "var(--mk-surface-2)",
    color: on ? "var(--mk-accent)" : "var(--mk-text-muted)",
  };
}

/**
 * Card de preferência de provider: escolhe quem responde por chat e por
 * transcrição (Groq ou OpenAI) + atalhos de 1 clique pra trocar tudo.
 */
export function ProviderCard({
  providerChat, providerTranscricao, temOpenai,
}: {
  providerChat: Prov;
  providerTranscricao: Prov;
  temOpenai: boolean;
}) {
  const tudoOpenai = providerChat === "openai" && providerTranscricao === "openai";
  const tudoGroq = providerChat === "groq" && providerTranscricao === "groq";

  return (
    <div className="mk-card mk-card-lg" style={{ marginBottom: 14, borderLeft: "3px solid var(--mk-accent)" }}>
      <h3 className="card-title" style={{ marginBottom: 4 }}>🔀 Provider de IA</h3>
      <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 14, lineHeight: 1.6 }}>
        Escolha quem processa cada tarefa. O <strong>Groq</strong> é grátis e rápido (padrão); o <strong>OpenAI</strong>{" "}
        (gpt-4o-mini / gpt-4o-transcribe) entra como alternativa ou fallback automático quando o Groq estourar o limite.
      </p>

      {/* Chat */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "var(--mk-text-muted)", fontWeight: 600, marginBottom: 6 }}>
          Chat — resumo, sentimento e follow-up
        </div>
        <form action={definirProviderIA} style={{ display: "flex", gap: 6 }}>
          <input type="hidden" name="provider_transcricao" value={providerTranscricao} />
          <button name="provider_chat" value="groq" style={pill(providerChat === "groq")}>⚡ Groq</button>
          <button name="provider_chat" value="openai" style={pill(providerChat === "openai")}>🤖 OpenAI</button>
        </form>
      </div>

      {/* Transcrição */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "var(--mk-text-muted)", fontWeight: 600, marginBottom: 6 }}>
          Transcrição de áudio
        </div>
        <form action={definirProviderIA} style={{ display: "flex", gap: 6 }}>
          <input type="hidden" name="provider_chat" value={providerChat} />
          <button name="provider_transcricao" value="groq" style={pill(providerTranscricao === "groq")}>⚡ Groq (Whisper)</button>
          <button name="provider_transcricao" value="openai" style={pill(providerTranscricao === "openai")}>🤖 OpenAI</button>
        </form>
      </div>

      {!temOpenai && (providerChat === "openai" || providerTranscricao === "openai") && (
        <div style={{ fontSize: 11.5, color: "#C97064", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <i className="ti ti-alert-triangle" /> Você escolheu OpenAI mas não tem chave OpenAI cadastrada abaixo. Sem ela, o sistema usa o Groq.
        </div>
      )}

      {/* Atalhos 1 clique */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: "0.5px solid var(--mk-border)", paddingTop: 12 }}>
        <form action={usarOpenaiEmTudo}>
          <button type="submit" className="cta-btn" style={{ fontSize: 12, opacity: tudoOpenai ? 0.5 : 1 }} disabled={tudoOpenai}>
            <i className="ti ti-arrow-right" /> Usar OpenAI em tudo
          </button>
        </form>
        <form action={voltarParaGroq}>
          <button type="submit" className="ghost-btn" style={{ fontSize: 12, opacity: tudoGroq ? 0.5 : 1 }} disabled={tudoGroq}>
            <i className="ti ti-arrow-back-up" /> Voltar tudo pro Groq
          </button>
        </form>
      </div>
    </div>
  );
}
