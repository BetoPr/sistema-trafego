"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Bot = "suporte" | "dados";
interface Msg { id?: string; papel: "user" | "assistant"; conteudo: string; pensando?: boolean }

const SUGESTOES_SUPORTE = [
  "Como atender um cliente?",
  "Como conectar WhatsApp?",
  "Como criar uma IA?",
  "O que é Pasta vs Etiqueta?",
  "Como criar uma campanha de follow-up?",
  "Como configurar a IA atendente?",
  "Como aplicar etiqueta automática por palavra?",
  "Como trocar a logo?",
  "Como agendar relatório?",
  "Como ver o Dashboard?",
];
const SUGESTOES_DADOS = [
  "Qual o ROAS dos últimos 7 dias?",
  "Quais campanhas estão queimando mais?",
  "Resumo dos KPIs dos últimos 30d.",
  "Top 5 criativos por gasto.",
];

const DELAY_MIN_MS = 3000; // 3s antes de comecar
const TYPEWRITER_MS = 18;  // delay entre cada caractere (typewriter)

export function ChatDrawer() {
  const pathname = usePathname() || "";
  // Esconde FAB em rotas com composer próprio (atendimentos, chat-teste, etc.)
  // pra não sobrepor o input de mensagem.
  const ocultarFab =
    pathname.startsWith("/atendimentos") ||
    pathname.startsWith("/chat-teste") ||
    pathname.startsWith("/envio-massa") ||
    pathname.startsWith("/grupos");
  const [aberto, setAberto] = useState(false);
  const [bot, setBot] = useState<Bot>("suporte");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [toolCall, setToolCall] = useState<string | null>(null);
  const [areaRoteada, setAreaRoteada] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const filaTypewriterRef = useRef<string>("");
  const typewriterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onToggle() { setAberto((a) => !a); }
    window.addEventListener("toggle-chat-assistente", onToggle as EventListener);
    return () => window.removeEventListener("toggle-chat-assistente", onToggle as EventListener);
  }, []);

  useEffect(() => {
    if (aberto) setTimeout(() => bodyRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
  }, [msgs, aberto]);

  useEffect(() => {
    setMsgs([]);
    setSessaoId(null);
    setToolCall(null);
  }, [bot]);

  function drainTypewriter() {
    if (typewriterTimerRef.current) return;
    function step() {
      if (!filaTypewriterRef.current) {
        typewriterTimerRef.current = null;
        return;
      }
      const c = filaTypewriterRef.current[0];
      filaTypewriterRef.current = filaTypewriterRef.current.slice(1);
      setMsgs((m) => {
        const arr = [...m];
        const last = arr[arr.length - 1];
        if (last && last.papel === "assistant") {
          arr[arr.length - 1] = { ...last, conteudo: (last.conteudo || "") + c, pensando: false };
        }
        return arr;
      });
      typewriterTimerRef.current = setTimeout(step, TYPEWRITER_MS);
    }
    typewriterTimerRef.current = setTimeout(step, TYPEWRITER_MS);
  }

  async function enviar(texto: string) {
    const msg = texto.trim();
    if (!msg || enviando) return;

    // 1) Tenta tour do RoboGuia primeiro (bot Suporte) — robô voa até elemento
    if (bot === "suporte" && typeof window !== "undefined" && window.RoboGuia) {
      const matched = window.RoboGuia.ask(msg);
      if (matched) {
        setAberto(false); // fecha drawer pra robô ter palco
        setInput("");
        return;
      }
    }

    setEnviando(true);
    setToolCall(null);
    setAreaRoteada(null);
    filaTypewriterRef.current = "";

    setMsgs((m) => [...m, { papel: "user", conteudo: msg }, { papel: "assistant", conteudo: "", pensando: true }]);
    setInput("");

    const inicio = Date.now();

    try {
      const r = await fetch("/api/chat-assistente", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bot, sessao_id: sessaoId, mensagem: msg }),
      });
      if (!r.ok || !r.body) {
        const err = await r.text();
        await aguardarDelayMin(inicio);
        setMsgs((m) => { const c = [...m]; c[c.length - 1] = { papel: "assistant", conteudo: `Erro: ${err}` }; return c; });
        return;
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let primeiroToken = true;

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
            const j = JSON.parse(data) as { delta?: string; done?: boolean; error?: string; tool_call?: { name: string }; sessao_id?: string; area?: string };
            if (j.sessao_id && !sessaoId) setSessaoId(j.sessao_id);
            if (j.area) setAreaRoteada(j.area);
            if (j.tool_call) setToolCall(j.tool_call.name);
            if (j.delta) {
              if (primeiroToken) {
                primeiroToken = false;
                await aguardarDelayMin(inicio);
              }
              filaTypewriterRef.current += j.delta;
              drainTypewriter();
            }
            if (j.error) {
              await aguardarDelayMin(inicio);
              setMsgs((m) => { const c = [...m]; c[c.length - 1] = { papel: "assistant", conteudo: `Erro: ${j.error}` }; return c; });
            }
          } catch {}
        }
      }
      // Espera fila typewriter terminar
      while (filaTypewriterRef.current || typewriterTimerRef.current) {
        await new Promise((res) => setTimeout(res, 50));
      }
    } catch (e) {
      await aguardarDelayMin(inicio);
      setMsgs((m) => { const c = [...m]; c[c.length - 1] = { papel: "assistant", conteudo: `Erro: ${e instanceof Error ? e.message : String(e)}` }; return c; });
    } finally {
      setEnviando(false);
      setToolCall(null);
    }
  }

  async function aguardarDelayMin(inicio: number) {
    const decorrido = Date.now() - inicio;
    if (decorrido < DELAY_MIN_MS) await new Promise((res) => setTimeout(res, DELAY_MIN_MS - decorrido));
  }

  const sugestoes = bot === "suporte" ? SUGESTOES_SUPORTE : SUGESTOES_DADOS;

  return (
    <>
      {!ocultarFab && <ChatFAB onClick={() => setAberto(true)} ativo={aberto} />}
      {aberto && (
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
            zIndex: 4500,
            display: "flex",
            flexDirection: "column",
            animation: "chat-slide-in .25s cubic-bezier(.2,.8,.2,1)",
          }}
        >
          <style>{`
            @keyframes chat-slide-in { from { transform: translateX(100%); } to { transform: none; } }
            @keyframes chat-dot { 0%, 60%, 100% { opacity: .25; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
            .chat-typing { display: inline-flex; gap: 4px; padding: 4px 0; }
            .chat-typing span { width: 6px; height: 6px; background: #00E19A; border-radius: 50%; animation: chat-dot 1.2s infinite; }
            .chat-typing span:nth-child(2) { animation-delay: .15s; }
            .chat-typing span:nth-child(3) { animation-delay: .3s; }
          `}</style>

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderBottom: ".5px solid var(--mk-border)" }}>
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" style={{ marginLeft: "auto", background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", fontSize: 18 }}>
              <i className="ti ti-x" />
            </button>
          </div>

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
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.pensando ? (
                    <div className="chat-typing"><span /><span /><span /></div>
                  ) : (
                    <FormatarTexto texto={m.conteudo} />
                  )}
                </div>
              </div>
            ))}
            {areaRoteada && (
              <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", padding: "2px 8px", fontStyle: "italic", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <i className="ti ti-route" /> Consultando especialista: <span style={{ color: "#00E19A" }}>{areaRoteada}</span>
              </div>
            )}
            {toolCall && (
              <div style={{ fontSize: 11, color: "var(--mk-text-muted)", padding: "4px 8px", fontStyle: "italic", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-tool" /> Consultando: {toolCall}…
              </div>
            )}
          </div>

          <div style={{ padding: 10, borderTop: ".5px solid var(--mk-border)" }}>
            <form onSubmit={(e) => { e.preventDefault(); enviar(input); }} style={{ display: "flex", gap: 6 }}>
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
      )}
    </>
  );
}

/** Formata texto com **bold**, listas e quebras. Simples markdown lite. */
function FormatarTexto({ texto }: { texto: string }) {
  if (!texto) return null;
  const linhas = texto.split("\n");
  return (
    <>
      {linhas.map((ln, i) => {
        const li = ln.match(/^\s*[-*]\s+(.*)$/);
        const num = ln.match(/^\s*(\d+)[.)]\s+(.*)$/);
        if (li) return <div key={i} style={{ display: "flex", gap: 6, marginLeft: 4 }}><span style={{ color: "#00E19A" }}>•</span><span>{renderInline(li[1])}</span></div>;
        if (num) return <div key={i} style={{ display: "flex", gap: 6, marginLeft: 4 }}><span style={{ color: "#00E19A", fontWeight: 700, minWidth: 18 }}>{num[1]}.</span><span>{renderInline(num[2])}</span></div>;
        if (!ln.trim()) return <div key={i} style={{ height: 6 }} />;
        return <div key={i}>{renderInline(ln)}</div>;
      })}
    </>
  );
}

function renderInline(s: string): React.ReactNode {
  // **bold** + `code`
  const parts: React.ReactNode[] = [];
  let resto = s;
  let key = 0;
  while (resto.length > 0) {
    const mb = resto.match(/\*\*([^*]+)\*\*/);
    const mc = resto.match(/`([^`]+)`/);
    let pos = -1;
    let tipo: "b" | "c" | null = null;
    let m: RegExpMatchArray | null = null;
    if (mb && (mb.index ?? -1) >= 0) { pos = mb.index!; tipo = "b"; m = mb; }
    if (mc && (mc.index ?? -1) >= 0 && (pos === -1 || mc.index! < pos)) { pos = mc.index!; tipo = "c"; m = mc; }
    if (pos === -1 || !m || !tipo) { parts.push(<span key={key++}>{resto}</span>); break; }
    if (pos > 0) parts.push(<span key={key++}>{resto.slice(0, pos)}</span>);
    if (tipo === "b") parts.push(<strong key={key++} style={{ color: "var(--mk-text)" }}>{m[1]}</strong>);
    else parts.push(<code key={key++} style={{ background: "var(--mk-bg-deep)", padding: "1px 5px", borderRadius: 4, fontSize: ".92em" }}>{m[1]}</code>);
    resto = resto.slice(pos + m[0].length);
  }
  return <>{parts}</>;
}

function ChatFAB({ onClick, ativo }: { onClick: () => void; ativo: boolean }) {
  if (ativo) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir Assistente IA"
      title="Assistente IA"
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        width: 56,
        height: 56,
        borderRadius: "50%",
        border: "1px solid #00E19A",
        background: "var(--mk-bg)",
        boxShadow: "0 10px 30px rgba(0,0,0,.45), 0 0 0 0 rgba(0,225,154,.45)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 4000,
        animation: "chat-fab-pulse 2.4s ease-in-out infinite",
      }}
    >
      <MascoteRoboMini size={36} ativo={false} />
      <style>{`
        @keyframes chat-fab-pulse {
          0%, 100% { box-shadow: 0 10px 30px rgba(0,0,0,.45), 0 0 0 0 rgba(0,225,154,.45); }
          50% { box-shadow: 0 10px 30px rgba(0,0,0,.45), 0 0 0 10px rgba(0,225,154,0); }
        }
        @keyframes mascote-bob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-2px) rotate(-3deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(-1px) rotate(3deg); }
        }
        @keyframes mascote-wave {
          0%, 80%, 100% { transform: rotate(18deg); }
          85% { transform: rotate(-30deg); }
          90% { transform: rotate(-10deg); }
          95% { transform: rotate(-30deg); }
        }
      `}</style>
    </button>
  );
}

/**
 * Mascote-robô mini — mesmo visual do RoboGuia em SVG inline.
 * Idle: bobbing leve + tilt + braço acena random.
 */
function MascoteRoboMini({ size = 36, ativo = true }: { size?: number; ativo?: boolean }) {
  return (
    <svg
      width={size}
      height={(size * 132) / 120}
      viewBox="0 0 120 132"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animation: ativo ? "mascote-bob 3.2s ease-in-out infinite" : undefined, display: "block" }}
      aria-hidden
    >
      <defs>
        <filter id="ch-neon" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g fill="none" stroke="#00E19A" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" filter="url(#ch-neon)">
        <line x1={60} y1={34} x2={60} y2={25} />
        <path d="M51,94 L57,94 L59,100 L49,100 Z" />
        <path d="M63,94 L69,94 L71,100 L61,100 Z" />
        <path d="M48,68 L35,86" />
        <path d="M72,68 L85,86" style={ativo ? { animation: "mascote-wave 4.8s ease-in-out infinite", transformOrigin: "72px 68px" } : undefined} />
        <rect x={42} y={34} width={36} height={27} rx={9} />
        <circle cx={52} cy={47.5} r={3.1} fill="#00E19A" stroke="none" />
        <circle cx={68} cy={47.5} r={3.1} fill="#00E19A" stroke="none" />
        <rect x={47} y={64} width={26} height={24} rx={7} />
        <line x1={54} y1={88} x2={54} y2={97} />
        <line x1={66} y1={88} x2={66} y2={97} />
      </g>
    </svg>
  );
}

// Backward compat — exporta vazio pra topbar não quebrar.
export function ChatTopbarButton() { return null; }
