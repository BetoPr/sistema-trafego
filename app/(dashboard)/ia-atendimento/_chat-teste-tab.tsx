"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  perfilId: string;
  perfilNome: string;
  provider: string;
  modelo: string;
  modoModular: boolean;
  totalCapsulas: number;
}

interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  tokens_in?: number;
  tokens_out?: number;
  capsulas?: string[];
  tool_calls?: ToolCall[];
  erro?: boolean;
}

export default function ChatTesteTab({ perfilId, perfilNome, provider, modelo, modoModular, totalCapsulas }: Props) {
  const [historico, setHistorico] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const k = `chat_teste_${perfilId}`;
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(k) : null;
    if (raw) {
      try { setHistorico(JSON.parse(raw)); } catch { setHistorico([]); }
    }
  }, [perfilId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`chat_teste_${perfilId}`, JSON.stringify(historico));
    }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historico, perfilId]);

  function limpar() {
    if (confirm("Limpar memória deste teste?")) {
      setHistorico([]);
      if (typeof window !== "undefined") window.localStorage.removeItem(`chat_teste_${perfilId}`);
    }
  }

  async function enviar() {
    const msg = input.trim();
    if (!msg || enviando) return;
    if (msg.toUpperCase() === "LIMPAR") {
      setHistorico([]);
      setInput("");
      if (typeof window !== "undefined") window.localStorage.removeItem(`chat_teste_${perfilId}`);
      return;
    }
    setInput("");
    const novoHist: Msg[] = [...historico, { role: "user", content: msg }];
    setHistorico(novoHist);
    setEnviando(true);
    try {
      const r = await fetch("/api/chat-teste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perfil_id: perfilId,
          mensagens: novoHist.map(({ role, content }) => ({ role, content })),
          mensagem: msg,
        }),
      });
      const data = await r.json();
      if (data.erro) {
        setHistorico((h) => [...h, { role: "assistant", content: `⚠️ ${data.erro}`, erro: true }]);
      } else {
        setHistorico((h) => [...h, {
          role: "assistant",
          content: data.texto || "(vazio)",
          tokens_in: data.tokens_in,
          tokens_out: data.tokens_out,
          capsulas: data.capsulas_usadas || [],
          tool_calls: data.tool_calls || [],
        }]);
      }
    } catch (e) {
      setHistorico((h) => [...h, { role: "assistant", content: `⚠️ ${(e as Error).message}`, erro: true }]);
    } finally {
      setEnviando(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  }

  return (
    <div className="mk-card mk-card-lg" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", minHeight: 540, height: "70vh" }}>
      <div style={{ padding: "11px 14px", borderBottom: ".5px solid var(--mk-border)", display: "flex", alignItems: "center", gap: 8 }}>
        <i className="ti ti-message-chatbot" style={{ color: "#00E19A", fontSize: 16 }} />
        <strong style={{ fontSize: 13 }}>{perfilNome}</strong>
        <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>
          {provider} · {modelo}
          {modoModular ? (
            <span style={{ color: totalCapsulas > 0 ? "#00E19A" : "#f59e0b", marginLeft: 6, fontWeight: 700 }}>
              · MODULAR ({totalCapsulas} {totalCapsulas === 1 ? "cápsula" : "cápsulas"})
            </span>
          ) : (
            <span style={{ color: "#9B7DBF", marginLeft: 6, fontWeight: 700 }}>· PROMPT ÚNICO</span>
          )}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>{historico.length} msgs</span>
        <button type="button" className="ghost-btn" style={{ fontSize: 11, color: "#C97064" }} onClick={limpar}>
          <i className="ti ti-trash" /> LIMPAR
        </button>
      </div>

      <div style={{ padding: "8px 14px", borderBottom: ".5px solid var(--mk-border)", background: "rgba(245,158,11,.06)", fontSize: 11, color: "var(--mk-text-muted)" }}>
        <i className="ti ti-info-circle" style={{ color: "#f59e0b" }} /> Modo teste: ferramentas são <strong>simuladas</strong> (mostradas na resposta sem efeito real). Gasta tokens da chave do perfil. Digite <code style={{ background: "rgba(0,225,154,.12)", color: "#00E19A", padding: "1px 5px", borderRadius: 3 }}>LIMPAR</code> pra zerar.
      </div>

      {modoModular && totalCapsulas === 0 && (
        <div style={{ padding: "8px 14px", borderBottom: ".5px solid var(--mk-border)", background: "rgba(201,112,100,.08)", fontSize: 11, color: "#C97064", display: "flex", alignItems: "center", gap: 6 }}>
          <i className="ti ti-alert-triangle" />
          <span><strong>Modo MODULAR ON mas sem cápsulas.</strong> IA usa só Identidade + Objetivo + Regras. Pra ela responder com conhecimento específico (FAQ/produtos/horários etc.), adicione cápsulas na aba <strong>Comportamento</strong>.</span>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {historico.length === 0 && (
          <div style={{ margin: "auto", color: "var(--mk-text-muted)", fontSize: 12.5, textAlign: "center" }}>
            <i className="ti ti-message-circle-dots" style={{ fontSize: 30, color: "#00E19A", display: "block", marginBottom: 6 }} />
            Comece a conversa abaixo.
          </div>
        )}
        {historico.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "82%",
            background: m.role === "user" ? "rgba(0,225,154,.12)" : m.erro ? "rgba(201,112,100,.10)" : "var(--mk-surface-2)",
            border: `.5px solid ${m.role === "user" ? "rgba(0,225,154,.35)" : m.erro ? "rgba(201,112,100,.35)" : "var(--mk-border)"}`,
            borderRadius: 10,
            padding: "9px 12px",
            fontSize: 13,
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: m.erro ? "#C97064" : "var(--mk-text)",
          }}>
            {/* Tool calls em destaque acima do texto */}
            {m.tool_calls && m.tool_calls.length > 0 && (
              <div style={{ marginBottom: m.content ? 8 : 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {m.tool_calls.map((tc, j) => (
                  <div key={j} style={{
                    background: "rgba(155,125,191,.14)",
                    border: ".5px solid rgba(155,125,191,.40)",
                    borderRadius: 7,
                    padding: "7px 10px",
                    fontSize: 11.5,
                    fontFamily: "monospace",
                    color: "var(--mk-text)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3, color: "#9B7DBF", fontWeight: 700, fontSize: 11 }}>
                      <i className="ti ti-tool" />
                      🔧 FERRAMENTA: {tc.tool}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--mk-text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                      {JSON.stringify(tc.args, null, 2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {m.content}
            {m.role === "assistant" && !m.erro && (
              <div style={{ marginTop: 6, fontSize: 10, color: "var(--mk-text-muted)", display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(m.tokens_in || m.tokens_out) && (
                  <span><i className="ti ti-bolt" /> {m.tokens_in || 0} in · {m.tokens_out || 0} out</span>
                )}
                {m.capsulas && m.capsulas.length > 0 && (
                  <span style={{ color: "#00E19A" }}><i className="ti ti-capsule-horizontal" /> {m.capsulas.join(", ")}</span>
                )}
              </div>
            )}
          </div>
        ))}
        {enviando && (
          <div style={{ alignSelf: "flex-start", padding: "9px 14px", background: "var(--mk-surface-2)", borderRadius: 10, fontSize: 12, color: "var(--mk-text-muted)", display: "inline-flex", gap: 6 }}>
            <span className="ct-dot" /><span className="ct-dot" /><span className="ct-dot" />
            <style>{`
              @keyframes ctDot { 0%,80%,100% { opacity:.2 } 40% { opacity:1 } }
              .ct-dot { width:6px; height:6px; border-radius:50%; background:#00E19A; display:inline-block; animation: ctDot 1.4s infinite ease-in-out both; }
              .ct-dot:nth-child(2){animation-delay:.16s}.ct-dot:nth-child(3){animation-delay:.32s}
            `}</style>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ padding: 10, borderTop: ".5px solid var(--mk-border)", display: "flex", gap: 8 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Digite (Enter envia, Shift+Enter quebra linha)"
          rows={2}
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 8,
            border: ".5px solid var(--mk-border)", background: "var(--mk-surface-2)",
            color: "var(--mk-text)", fontSize: 13, fontFamily: "inherit", resize: "none",
          }}
        />
        <button type="button" className="cta-btn" onClick={enviar} disabled={enviando || !input.trim()}
          style={{ opacity: enviando || !input.trim() ? 0.5 : 1, alignSelf: "stretch", padding: "0 16px" }}>
          <i className="ti ti-send" /> Enviar
        </button>
      </div>
    </div>
  );
}
