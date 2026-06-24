"use client";

import { useEffect, useRef, useState } from "react";

interface Perfil {
  id: string;
  nome: string;
  provider: string;
  modelo: string;
  modo_modular: boolean;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  tokens_in?: number;
  tokens_out?: number;
  capsulas?: string[];
  erro?: boolean;
}

export default function ChatTesteCliente({ perfis }: { perfis: Perfil[] }) {
  const [perfilId, setPerfilId] = useState<string>(perfis[0]?.id || "");
  const [historico, setHistorico] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const perfil = perfis.find((p) => p.id === perfilId);

  useEffect(() => {
    const k = `chat_teste_${perfilId}`;
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(k) : null;
    if (raw) {
      try {
        setHistorico(JSON.parse(raw));
      } catch {
        setHistorico([]);
      }
    } else {
      setHistorico([]);
    }
  }, [perfilId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`chat_teste_${perfilId}`, JSON.stringify(historico));
    }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historico, perfilId]);

  async function enviar() {
    const msg = input.trim();
    if (!msg || enviando) return;

    if (msg.toUpperCase() === "LIMPAR") {
      setHistorico([]);
      setInput("");
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`chat_teste_${perfilId}`);
      }
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
        setHistorico((h) => [
          ...h,
          {
            role: "assistant",
            content: data.texto || "(vazio)",
            tokens_in: data.tokens_in,
            tokens_out: data.tokens_out,
            capsulas: data.capsulas_usadas || [],
          },
        ]);
      }
    } catch (e) {
      setHistorico((h) => [...h, { role: "assistant", content: `⚠️ ${(e as Error).message}`, erro: true }]);
    } finally {
      setEnviando(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 14, height: "calc(100vh - 220px)", minHeight: 500 }}>
      {/* Sidebar — seleção de perfil */}
      <div className="mk-card mk-card-lg" style={{ padding: 14, overflowY: "auto" }}>
        <h3 className="card-title" style={{ marginBottom: 8, fontSize: 13 }}>IAs disponíveis</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {perfis.map((p) => {
            const on = p.id === perfilId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPerfilId(p.id)}
                style={{
                  textAlign: "left",
                  padding: "10px 11px",
                  background: on ? "rgba(0,225,154,.14)" : "var(--mk-surface-2)",
                  border: `.5px solid ${on ? "#00E19A" : "var(--mk-border)"}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  color: on ? "#00E19A" : "var(--mk-text)",
                  fontWeight: on ? 700 : 500,
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  fontSize: 12.5,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="ti ti-robot" style={{ fontSize: 14 }} />
                  {p.nome}
                  {p.modo_modular && (
                    <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 8, background: "rgba(0,225,154,.20)", color: "#00E19A" }}>
                      MOD
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>
                  {p.provider} · {p.modelo}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 14, padding: 10, background: "rgba(245,158,11,.06)", border: ".5px solid rgba(245,158,11,.25)", borderRadius: 8, fontSize: 11, lineHeight: 1.5, color: "var(--mk-text-secondary)" }}>
          <i className="ti ti-info-circle" style={{ color: "#f59e0b" }} /> Modo teste: <strong>sem ferramentas</strong>, sem efeitos colaterais. Só conversação. Gasta tokens da sua chave.
        </div>
      </div>

      {/* Chat */}
      <div className="mk-card mk-card-lg" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "11px 14px", borderBottom: ".5px solid var(--mk-border)", display: "flex", alignItems: "center", gap: 8 }}>
          <i className="ti ti-message-chatbot" style={{ color: "#00E19A", fontSize: 16 }} />
          <strong style={{ fontSize: 13 }}>{perfil?.nome || "—"}</strong>
          <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>
            {historico.length > 0 ? `${historico.length} msgs` : "histórico vazio"}
          </span>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="ghost-btn"
            style={{ fontSize: 11, color: "#C97064" }}
            onClick={() => {
              if (confirm("Limpar memória deste teste?")) {
                setHistorico([]);
                if (typeof window !== "undefined") window.localStorage.removeItem(`chat_teste_${perfilId}`);
              }
            }}
          >
            <i className="ti ti-trash" /> LIMPAR
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {historico.length === 0 && (
            <div style={{ margin: "auto", color: "var(--mk-text-muted)", fontSize: 12.5, textAlign: "center" }}>
              <i className="ti ti-message-circle-dots" style={{ fontSize: 30, color: "#00E19A", display: "block", marginBottom: 6 }} />
              Comece a conversa abaixo.
              <br />
              Digite <code style={{ background: "rgba(0,225,154,.12)", color: "#00E19A", padding: "1px 6px", borderRadius: 4 }}>LIMPAR</code> a qualquer momento.
            </div>
          )}
          {historico.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "78%",
                background: m.role === "user" ? "rgba(0,225,154,.12)" : m.erro ? "rgba(201,112,100,.10)" : "var(--mk-surface-2)",
                border: `.5px solid ${m.role === "user" ? "rgba(0,225,154,.35)" : m.erro ? "rgba(201,112,100,.35)" : "var(--mk-border)"}`,
                borderRadius: 10,
                padding: "9px 12px",
                fontSize: 13,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: m.erro ? "#C97064" : "var(--mk-text)",
              }}
            >
              {m.content}
              {m.role === "assistant" && !m.erro && (
                <div style={{ marginTop: 6, fontSize: 10, color: "var(--mk-text-muted)", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(m.tokens_in || m.tokens_out) && (
                    <span>
                      <i className="ti ti-bolt" /> {m.tokens_in || 0} in · {m.tokens_out || 0} out
                    </span>
                  )}
                  {m.capsulas && m.capsulas.length > 0 && (
                    <span style={{ color: "#00E19A" }}>
                      <i className="ti ti-capsule-horizontal" /> {m.capsulas.join(", ")}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
          {enviando && (
            <div style={{ alignSelf: "flex-start", padding: "9px 14px", background: "var(--mk-surface-2)", borderRadius: 10, fontSize: 12, color: "var(--mk-text-muted)", display: "inline-flex", gap: 6 }}>
              <span className="ct-dot" />
              <span className="ct-dot" />
              <span className="ct-dot" />
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
            placeholder="Digite uma mensagem (Enter envia, Shift+Enter quebra linha)"
            rows={2}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              border: ".5px solid var(--mk-border)",
              background: "var(--mk-surface-2)",
              color: "var(--mk-text)",
              fontSize: 13,
              fontFamily: "inherit",
              resize: "none",
            }}
          />
          <button
            type="button"
            className="cta-btn"
            onClick={enviar}
            disabled={enviando || !input.trim()}
            style={{ opacity: enviando || !input.trim() ? 0.5 : 1, alignSelf: "stretch", padding: "0 16px" }}
          >
            <i className="ti ti-send" /> Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
