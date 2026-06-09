"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AudioPlayer } from "./_audio";
import { ChatHeader } from "./_header";

interface Mensagem {
  id: string;
  autor: "cliente" | "atendente" | "sistema" | "bot";
  tipo: string;
  conteudo: string | null;
  transcricao: string | null;
  midia_url: string | null;
  midia_mime: string | null;
  status: string;
  created_at: string;
  usuario_id: string | null;
}

interface MensagemRapida {
  id: string;
  comando: string;
  conteudo: string;
}

interface Props {
  ticketId: string;
  ticketNumero: number;
  canalId: string | null;
  canalConectado: boolean;
  contatoNome: string;
  contatoNomeCurto: string;
  contatoTelefone?: string | null;
  filaAtualNome?: string | null;
  usuarioAtualNome?: string | null;
  filas: Array<{ id: string; nome: string; cor?: string | null }>;
  usuarios: Array<{ id: string; nome: string }>;
  canais: Array<{ id: string; nome: string; status: string; numero_conectado?: string | null }>;
  detalhesAbertos: boolean;
  urlToggleDetalhes: string;
  mensagensIniciais: Mensagem[];
  mensagensRapidas: MensagemRapida[];
  userNomeMap: Record<string, string>;
}

export function ChatView(props: Props) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Mensagem[]>(props.mensagensIniciais);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll bottom on new msg
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs.length]);

  // Sync server-side initial messages quando refresh acontece
  useEffect(() => {
    setMsgs(props.mensagensIniciais);
  }, [props.mensagensIniciais]);

  // Realtime subscription
  useEffect(() => {
    const sb = createClient();
    const ch = sb
      .channel(`mensagens:${props.ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens", filter: `ticket_id=eq.${props.ticketId}` },
        (payload) => {
          const m = payload.new as Mensagem;
          setMsgs((prev) => {
            // Se já existe (incluindo optimistic com wa_message_id batendo), substitui
            const idx = prev.findIndex((x) => x.id === m.id);
            if (idx !== -1) return prev;
            // Remove optimistic se conteúdo+autor batem
            const filtered = prev.filter((x) => !(x.id.startsWith("temp_") && x.conteudo === m.conteudo && x.autor === m.autor));
            return [...filtered, m];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mensagens", filter: `ticket_id=eq.${props.ticketId}` },
        (payload) => {
          const m = payload.new as Mensagem;
          setMsgs((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [props.ticketId]);

  // Slash command detect
  useEffect(() => {
    if (!text.startsWith("/")) {
      setShowShortcuts(false);
      return;
    }
    setShowShortcuts(true);
  }, [text]);

  function applyShortcut(s: MensagemRapida) {
    setText(s.conteudo);
    setShowShortcuts(false);
  }

  async function enviar() {
    if (!text.trim() || !props.canalId) return;
    setSending(true);
    const textoEnviado = text;
    // Optimistic insert imediato — UX instantâneo enquanto fetch processa
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: Mensagem = {
      id: tempId,
      autor: "atendente",
      tipo: "texto",
      conteudo: textoEnviado,
      transcricao: null,
      midia_url: null,
      midia_mime: null,
      status: "pendente",
      created_at: new Date().toISOString(),
      usuario_id: null,
    };
    setMsgs((prev) => [...prev, optimistic]);
    setText("");

    try {
      const r = await fetch(`/api/canais/${props.canalId}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticketId: props.ticketId, text: textoEnviado }),
      });
      const j = await r.json();
      if (!r.ok) {
        alert(`Falha ao enviar: ${j.error || j.msg || r.statusText}`);
        // rollback optimistic
        setMsgs((prev) => prev.filter((m) => m.id !== tempId));
        setText(textoEnviado);
      } else {
        // Marca como enviada (server vai logo logo retornar via realtime
        // a versão definitiva com o id real e substituirá; até lá fica pendente)
        setMsgs((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: "enviada", id: j.mensagemId || tempId } : m)),
        );
        router.refresh();
      }
    } catch (e) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`);
      setMsgs((prev) => prev.filter((m) => m.id !== tempId));
      setText(textoEnviado);
    } finally {
      setSending(false);
    }
  }

  async function encerrar() {
    if (!confirm("Encerrar atendimento? O ticket será movido para Fechados.")) return;
    const r = await fetch(`/api/atendimentos/${props.ticketId}/encerrar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    if (r.ok) router.push("/atendimentos");
    else alert("Falha ao encerrar.");
  }

  const filteredShortcuts = props.mensagensRapidas.filter((s) => s.comando.toLowerCase().includes(text.toLowerCase()));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <ChatHeader
        ticketId={props.ticketId}
        ticketNumero={props.ticketNumero}
        canalId={props.canalId}
        canalConectado={props.canalConectado}
        contatoNome={props.contatoNome}
        contatoIniciais={props.contatoNomeCurto}
        contatoTelefone={props.contatoTelefone}
        filaAtualNome={props.filaAtualNome}
        usuarioAtualNome={props.usuarioAtualNome}
        filas={props.filas}
        usuarios={props.usuarios}
        canais={props.canais}
        detalhesAbertos={props.detalhesAbertos}
        urlToggleDetalhes={props.urlToggleDetalhes}
      />

      {/* Mensagens */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, background: "var(--mk-surface-2)" }}>
        {msgs.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12, padding: 40 }}>Sem mensagens neste ticket.</div>
        ) : (
          msgs.map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: m.autor === "cliente" ? "flex-start" : "flex-end" }}>
              <div
                style={{
                  maxWidth: "72%",
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: m.autor === "cliente" ? "var(--mk-surface)" : "rgba(155,125,191,0.18)",
                  border: "0.5px solid var(--mk-border)",
                  color: "var(--mk-text)",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.autor !== "cliente" && m.usuario_id && (
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#9B7DBF", marginBottom: 2 }}>
                    {props.userNomeMap[m.usuario_id] || "Atendente"}
                  </div>
                )}
                {m.tipo === "audio" ? (
                  m.midia_url ? (
                    <AudioPlayer midiaPath={m.midia_url} transcricao={m.transcricao} />
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--mk-text-secondary)" }}>
                        <i className="ti ti-microphone" /> Áudio <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>(baixando...)</span>
                      </div>
                      {m.transcricao && (
                        <div style={{ marginTop: 6, fontSize: 11, color: "var(--mk-text-muted)", fontStyle: "italic", borderLeft: "2px solid var(--mk-border)", paddingLeft: 6 }}>
                          {m.transcricao}
                        </div>
                      )}
                    </>
                  )
                ) : m.tipo === "imagem" || m.tipo === "video" || m.tipo === "documento" ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--mk-text-secondary)" }}>
                      <i className={`ti ${m.tipo === "imagem" ? "ti-photo" : m.tipo === "video" ? "ti-video" : "ti-file"}`} />
                      [{m.tipo}]
                    </div>
                    {m.conteudo && <div style={{ marginTop: 4 }}>{m.conteudo}</div>}
                  </>
                ) : (
                  m.conteudo || m.transcricao || `[${m.tipo}]`
                )}
                <div style={{ fontSize: 9.5, color: "var(--mk-text-muted)", marginTop: 4, textAlign: "right" }}>
                  {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  {m.autor === "atendente" && (() => {
                    const icone = m.status === "pendente" ? "ti-clock"
                      : m.status === "falha" ? "ti-alert-circle"
                      : (m.status === "entregue" || m.status === "lida") ? "ti-checks"
                      : "ti-check";
                    const cor = m.status === "lida" ? "#5B8BA6"
                      : m.status === "falha" ? "#C97064"
                      : m.status === "pendente" ? "var(--mk-text-muted)"
                      : undefined;
                    return <i className={`ti ${icone}`} style={{ marginLeft: 4, color: cor }} />;
                  })()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Slash shortcuts */}
      {showShortcuts && filteredShortcuts.length > 0 && (
        <div style={{ borderTop: "0.5px solid var(--mk-border)", maxHeight: 180, overflowY: "auto", background: "var(--mk-surface)" }}>
          {filteredShortcuts.slice(0, 6).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => applyShortcut(s)}
              style={{
                display: "flex",
                width: "100%",
                gap: 10,
                padding: "8px 14px",
                background: "transparent",
                border: 0,
                borderBottom: "0.5px solid var(--mk-border)",
                color: "var(--mk-text)",
                textAlign: "left",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              <code style={{ background: "rgba(155,125,191,0.18)", color: "#9B7DBF", padding: "1px 5px", borderRadius: 4, fontSize: 10.5 }}>{s.comando}</code>
              <span style={{ flex: 1, color: "var(--mk-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.conteudo.slice(0, 100)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "10px 12px", borderTop: "0.5px solid var(--mk-border)", background: "var(--mk-surface)" }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          placeholder={props.canalConectado ? "Mensagem… (Enter envia, Shift+Enter quebra linha; / para atalho)" : "Canal desconectado — reconecte pra enviar."}
          disabled={!props.canalConectado || sending}
          rows={Math.min(4, Math.max(1, text.split("\n").length))}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 10,
            border: "0.5px solid var(--mk-border)",
            background: "var(--mk-surface-2)",
            color: "var(--mk-text)",
            fontSize: 12.5,
            resize: "none",
            fontFamily: "inherit",
          }}
        />
        <button onClick={enviar} disabled={!props.canalConectado || sending || !text.trim()} className="cta-btn">
          <i className="ti ti-send" /> {sending ? "..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}
