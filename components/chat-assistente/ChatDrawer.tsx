"use client";

import { useEffect, useRef, useState } from "react";

type Bot = "suporte" | "dados";
interface Msg { id?: string; papel: "user" | "assistant"; conteudo: string }

const SUGESTOES_SUPORTE = [
  "Como criar uma campanha de follow-up?",
  "O que é Pasta vs Etiqueta?",
  "Como aplicar etiqueta automática por palavra?",
  "Como configurar a IA atendente?",
];
const SUGESTOES_DADOS = [
  "Qual o ROAS dos últimos 7 dias?",
  "Quais campanhas estão queimando mais?",
  "Resumo dos KPIs dos últimos 30d.",
  "Top 5 criativos por gasto.",
];

export function ChatDrawer() {
  const [aberto, setAberto] = useState(false);
  const [bot, setBot] = useState<Bot>("suporte");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [toolCall, setToolCall] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onToggle() { setAberto((a) => !a); }
    window.addEventListener("toggle-chat-assistente", onToggle as EventListener);
    return () => window.removeEventListener("toggle-chat-assistente", onToggle as EventListener);
  }, []);

  useEffect(() => {
    if (aberto) setTimeout(() => bodyRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
  }, [msgs, aberto]);

  // Reset ao trocar bot
  useEffect(() => {
    setMsgs([]);
    setSessaoId(null);
    setToolCall(null);
  }, [bot]);

  async function enviar(texto: string) {
    const msg = texto.trim();
    if (!msg || enviando) return;
    setEnviando(true);
    setToolCall(null);
    setMsgs((m) => [...m, { papel: "user", conteudo: msg }, { papel: "assistant", conteudo: "" }]);
    setInput("");

    try {
      const r = await fetch("/api/chat-assistente", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bot, sessao_id: sessaoId, mensagem: msg }),
      });
      if (!r.ok || !r.body) {
        const err = await r.text();
        setMsgs((m) => { const c = [...m]; c[c.length - 1] = { papel: "assistant", conteudo: `Erro: ${err}` }; return c; });
        return;
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acum = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const chunk = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 2);
          if (!chunk.startsWith("data:")) continue;
          const data = chunk.slice(5).trim();
          try {
            const j = JSON.parse(data) as { delta?: string; done?: boolean; error?: string; tool_call?: { name: string }; sessao_id?: string };
            if (j.sessao_id && !sessaoId) setSessaoId(j.sessao_id);
            if (j.tool_call) setToolCall(j.tool_call.name);
            if (j.delta) {
              acum += j.delta;
              setMsgs((m) => { const c = [...m]; c[c.length - 1] = { papel: "assistant", conteudo: acum }; return c; });
            }
            if (j.error) {
              setMsgs((m) => { const c = [...m]; c[c.length - 1] = { papel: "assistant", conteudo: `Erro: ${j.error}` }; return c; });
            }
          } catch {}
        }
      }
    } catch (e) {
      setMsgs((m) => { const c = [...m]; c[c.length - 1] = { papel: "assistant", conteudo: `Erro: ${e instanceof Error ? e.message : String(e)}` }; return c; });
    } finally {
      setEnviando(false);
      setToolCall(null);
    }
  }

  if (!aberto) return null;

  const sugestoes = bot === "suporte" ? SUGESTOES_SUPORTE : SUGESTOES_DADOS;

  return (
    <div
      role="dialog"
      aria-label="Assistente IA"
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        width: 420,
        maxWidth: "100vw",
        background: "var(--mk-bg)",
        borderLeft: ".5px solid var(--mk-border)",
        boxShadow: "-14px 0 40px rgba(0,0,0,.4)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        animation: "chat-slide-in .25s cubic-bezier(.2,.8,.2,1)",
      }}
    >
      <style>{`@keyframes chat-slide-in { from { transform: translateX(100%); } to { transform: none; } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderBottom: ".5px solid var(--mk-border)" }}>
        <i className="ti ti-robot" style={{ fontSize: 20, color: "#00E19A" }} />
        <div style={{ fontWeight: 700, fontSize: 14 }}>Assistente IA</div>
        <button
          type="button"
          onClick={() => setAberto(false)}
          aria-label="Fechar"
          style={{ marginLeft: "auto", background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", fontSize: 18 }}
        >
          <i className="ti ti-x" />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", padding: "10px 12px", gap: 6, borderBottom: ".5px solid var(--mk-border)" }}>
        {([["suporte", "ti-help", "Suporte CRM"], ["dados", "ti-chart-bar", "Meus Dados"]] as Array<[Bot, string, string]>).map(([b, ic, lbl]) => (
          <button
            key={b}
            type="button"
            onClick={() => setBot(b)}
            aria-pressed={bot === b}
            style={{
              flex: 1,
              padding: "8px 10px",
              border: `.5px solid ${bot === b ? "#00E19A" : "var(--mk-border)"}`,
              background: bot === b ? "rgba(0,225,154,.10)" : "var(--mk-surface-2)",
              color: bot === b ? "#00E19A" : "var(--mk-text-secondary)",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              transition: "background .2s, color .2s, border-color .2s",
            }}
          >
            <i className={`ti ${ic}`} />
            {lbl}
          </button>
        ))}
      </div>

      {/* Mensagens */}
      <div ref={bodyRef} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.length === 0 && (
          <div>
            <div style={{ fontSize: 12, color: "var(--mk-text-muted)", marginBottom: 10 }}>
              {bot === "suporte" ? "Tira dúvidas sobre o CRM. Tutoriais, configuração, fluxos." : "Análise dos dados da sua agência. ROAS, campanhas, criativos."}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sugestoes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  disabled={enviando}
                  style={{ textAlign: "left", padding: "10px 12px", background: "var(--mk-surface-2)", border: ".5px solid var(--mk-border)", borderRadius: 9, color: "var(--mk-text-secondary)", fontSize: 12, cursor: "pointer", transition: "background .2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,225,154,.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--mk-surface-2)")}
                >
                  <i className="ti ti-sparkles" style={{ color: "#00E19A", marginRight: 6 }} />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.papel === "user" ? "flex-end" : "flex-start" }}>
            <div
              style={{
                maxWidth: "85%",
                padding: "9px 12px",
                borderRadius: 12,
                background: m.papel === "user" ? "rgba(0,225,154,.12)" : "var(--mk-surface-2)",
                border: m.papel === "user" ? ".5px solid rgba(0,225,154,.32)" : ".5px solid var(--mk-border)",
                color: "var(--mk-text)",
                fontSize: 12.5,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.conteudo || (i === msgs.length - 1 && enviando ? "..." : "")}
            </div>
          </div>
        ))}
        {toolCall && (
          <div style={{ fontSize: 11, color: "var(--mk-text-muted)", padding: "4px 8px", fontStyle: "italic" }}>
            <i className="ti ti-tool" style={{ marginRight: 4 }} /> Consultando: {toolCall}…
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: 10, borderTop: ".5px solid var(--mk-border)" }}>
        <form
          onSubmit={(e) => { e.preventDefault(); enviar(input); }}
          style={{ display: "flex", gap: 6 }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={bot === "suporte" ? "Como faço pra..." : "Analisa meus dados..."}
            disabled={enviando}
            style={{ flex: 1, padding: "9px 12px", background: "var(--mk-surface-2)", border: ".5px solid var(--mk-border)", borderRadius: 18, color: "var(--mk-text)", fontSize: 12.5 }}
          />
          <button
            type="submit"
            disabled={enviando || !input.trim()}
            aria-label="Enviar"
            style={{ width: 38, height: 38, border: 0, borderRadius: "50%", background: "#00E19A", color: "#0a0f10", cursor: enviando ? "wait" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: enviando || !input.trim() ? .5 : 1 }}
          >
            <i className={`ti ${enviando ? "ti-loader-2" : "ti-send"}`} style={{ fontSize: 16, animation: enviando ? "spin 1s linear infinite" : undefined }} />
          </button>
        </form>
        <div style={{ fontSize: 10, color: "var(--mk-text-muted)", textAlign: "center", marginTop: 6 }}>
          Modelo: {bot === "suporte" ? "Llama 8B (Groq)" : "Llama 70B (Groq)"} · {bot === "suporte" ? "rápido" : "com tools"}
        </div>
      </div>
    </div>
  );
}

export function ChatTopbarButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("toggle-chat-assistente"))}
      aria-label="Abrir assistente IA"
      title="Assistente IA"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: "var(--mk-surface)",
        border: ".5px solid var(--mk-border)",
        color: "#00E19A",
        cursor: "pointer",
        transition: "background .2s, transform .2s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,225,154,.10)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--mk-surface)"; }}
    >
      <i className="ti ti-robot" style={{ fontSize: 17 }} />
    </button>
  );
}
