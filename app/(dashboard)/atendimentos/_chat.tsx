"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AudioPlayer } from "./_audio";
import { MediaPreview } from "./_media";
import { ChatHeader } from "./_header";
import { InputBar } from "./_input";

const scrollBtnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  border: "0.5px solid var(--mk-border)",
  background: "var(--mk-surface)",
  color: "var(--mk-text-secondary)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
};

const replyBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 26,
  height: 26,
  borderRadius: "50%",
  border: "0.5px solid var(--mk-border)",
  background: "var(--mk-surface)",
  color: "var(--mk-text-muted)",
  cursor: "pointer",
  fontSize: 13,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

interface AdReferral {
  sourceType?: string;
  sourceUrl?: string;
  sourceId?: string;
  title?: string;
  body?: string;
  mediaType?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  ctwaClid?: string;
}

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
  wa_message_id?: string | null;
  metadata?: {
    reply_to?: string;
    ad_referral?: AdReferral;
    midia_tentativas?: number;
    midia_erro?: string;
    midia_perdida?: boolean;
  } | null;
}

/**
 * Balão pra mídia que ainda não baixou — mostra estado, contador e botão
 * de re-baixar. Limite auto = 3 (depois disso vira "indisponível" mas botão
 * manual continua funcionando).
 */
function MidiaPendente({ mensagem, label, icone }: { mensagem: Mensagem; label: string; icone: string }) {
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const tentativas = mensagem.metadata?.midia_tentativas || 0;
  const perdida = mensagem.metadata?.midia_perdida === true;

  async function tentar() {
    if (rodando) return;
    setRodando(true);
    setErro(null);
    try {
      const r = await fetch("/api/atendimentos/midia-retry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mensagemId: mensagem.id }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) setErro(j.error || "Falhou — UAZAPI sem dado pra essa mensagem");
      // Sucesso → realtime/refresh atualiza a URL automático
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setRodando(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: perdida ? "var(--mk-text-muted)" : "var(--mk-text-secondary)" }}>
        <i className={`ti ${icone}`} />
        {label}
        <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>
          {perdida ? "(indisponível)" : rodando ? "(baixando…)" : tentativas > 0 ? `(${tentativas}/3 tentativas)` : "(aguardando)"}
        </span>
      </div>
      {mensagem.transcricao && (
        <div style={{ fontSize: 11, color: "var(--mk-text-muted)", fontStyle: "italic", borderLeft: "2px solid var(--mk-border)", paddingLeft: 6 }}>
          {mensagem.transcricao}
        </div>
      )}
      <button
        type="button"
        onClick={tentar}
        disabled={rodando}
        style={{
          marginTop: 2,
          fontSize: 10.5,
          padding: "3px 8px",
          background: "transparent",
          border: "0.5px solid var(--mk-border)",
          borderRadius: 6,
          color: "var(--mk-text)",
          cursor: "pointer",
          alignSelf: "flex-start",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
        title={perdida ? "UAZAPI já não tem mais essa mídia, mas pode tentar mesmo assim" : "Tentar baixar de novo"}
      >
        <i className={`ti ${rodando ? "ti-loader" : "ti-refresh"}`} />
        {rodando ? "Baixando…" : perdida ? "Forçar tentativa" : "Tentar agora"}
      </button>
      {erro && <div style={{ fontSize: 10, color: "#C97064" }}>{erro}</div>}
    </div>
  );
}

/** Detecta plataforma de origem do anúncio pra mostrar ícone + label certos. */
function origemAnuncio(ad: AdReferral): { icone: string; label: string; cor: string } {
  const url = (ad.sourceUrl || "").toLowerCase();
  if (url.includes("instagram.com") || ad.sourceType?.toLowerCase().includes("instagram")) {
    return { icone: "ti-brand-instagram", label: "Instagram", cor: "#E1306C" };
  }
  if (url.includes("facebook.com") || url.includes("fb.com") || ad.sourceType?.toLowerCase().includes("facebook")) {
    return { icone: "ti-brand-facebook", label: "Facebook", cor: "#1877F2" };
  }
  return { icone: "ti-ad", label: "Anúncio", cor: "#9B7DBF" };
}

function CardAnuncio({ ad }: { ad: AdReferral }) {
  const origem = origemAnuncio(ad);
  return (
    <a
      href={ad.sourceUrl || "#"}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        background: "var(--mk-surface)",
        border: "0.5px solid var(--mk-border)",
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 4,
        textDecoration: "none",
        color: "var(--mk-text)",
        maxWidth: 340,
      }}
      title={ad.sourceUrl || ""}
    >
      {ad.thumbnailUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={ad.thumbnailUrl} alt="" style={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block" }} />
      )}
      <div style={{ padding: "8px 10px" }}>
        {ad.title && <div style={{ fontWeight: 600, fontSize: 12.5, lineHeight: 1.3, marginBottom: 3 }}>{ad.title}</div>}
        {ad.body && <div style={{ fontSize: 11.5, color: "var(--mk-text-secondary)", lineHeight: 1.35, marginBottom: 4 }}>{ad.body}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: origem.cor, fontWeight: 500 }}>
          <i className={`ti ${origem.icone}`} /> Veio de um anúncio do {origem.label}
        </div>
      </div>
    </a>
  );
}

/** Preview curto de uma mensagem (pra citação). */
function previewMsg(m: Mensagem): string {
  if (m.tipo === "audio") return "🎤 Áudio";
  if (m.tipo === "imagem") return "🖼️ Imagem";
  if (m.tipo === "video") return "🎬 Vídeo";
  if (m.tipo === "documento") return "📄 Documento";
  return (m.conteudo || m.transcricao || "Mensagem").slice(0, 90);
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
  contatoFotoUrl?: string | null;
  contatoTelefone?: string | null;
  filaAtualNome?: string | null;
  usuarioAtualNome?: string | null;
  filas: Array<{ id: string; nome: string; cor?: string | null }>;
  usuarios: Array<{ id: string; nome: string }>;
  canais: Array<{ id: string; nome: string; status: string; numero_conectado?: string | null }>;
  detalhesAbertos: boolean;
  onToggleDetalhes: () => void;
  onBack?: () => void;
  onRefresh?: () => void;
  servicos?: Array<{ id: string; nome: string }>;
  servicosHabilitados?: boolean;
  mensagensIniciais: Mensagem[];
  mensagensRapidas: MensagemRapida[];
  userNomeMap: Record<string, string>;
}

export function ChatView(props: Props) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Mensagem[]>(props.mensagensIniciais);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [respondendo, setRespondendo] = useState<Mensagem | null>(null);

  const acharCitada = (wamid?: string | null) => (wamid ? msgs.find((x) => x.wa_message_id === wamid) || null : null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll bottom on new msg
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs.length]);

  // Sincroniza com o snapshot do servidor SEM apagar mensagens locais.
  // Substituir a lista inteira fazia o balão otimista (recém-enviado) sumir
  // quando o snapshot ainda não trazia a mensagem (lag de propagação) e
  // reaparecer depois via realtime — o efeito "some e volta". Aqui mesclamos:
  // mantém tudo que é local e ainda não está no snapshot; descarta só o
  // otimista cuja versão real já chegou (mesmo conteúdo+autor+tipo).
  useEffect(() => {
    setMsgs((prev) => {
      const incoming = props.mensagensIniciais;
      const incomingIds = new Set(incoming.map((m) => m.id));
      const merged: Mensagem[] = [...incoming];
      for (const m of prev) {
        if (incomingIds.has(m.id)) continue;
        if (
          m.id.startsWith("temp_") &&
          m.conteudo &&
          incoming.some((im) => im.autor === m.autor && im.conteudo === m.conteudo && im.tipo === m.tipo)
        ) {
          continue;
        }
        merged.push(m);
      }
      merged.sort((a, b) => a.created_at.localeCompare(b.created_at));
      return merged;
    });
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
    const replyTo = respondendo?.wa_message_id || undefined;
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
      metadata: replyTo ? { reply_to: replyTo } : null,
    };
    setMsgs((prev) => [...prev, optimistic]);
    setText("");
    setRespondendo(null);

    try {
      const r = await fetch(`/api/canais/${props.canalId}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticketId: props.ticketId, text: textoEnviado, replyid: replyTo }),
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
        // Atualiza só a lista lateral (ordenação/última msg) — sem router.refresh,
        // que recarregava a página inteira e contribuía pro flicker do balão.
        props.onRefresh?.();
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
        contatoFotoUrl={props.contatoFotoUrl}
        contatoTelefone={props.contatoTelefone}
        filaAtualNome={props.filaAtualNome}
        usuarioAtualNome={props.usuarioAtualNome}
        filas={props.filas}
        usuarios={props.usuarios}
        canais={props.canais}
        detalhesAbertos={props.detalhesAbertos}
        onToggleDetalhes={props.onToggleDetalhes}
        onBack={props.onBack}
        onRefresh={props.onRefresh}
        servicos={props.servicos}
        servicosHabilitados={props.servicosHabilitados}
      />

      {/* Wrapper relativo pros botões fixos */}
      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", minHeight: 0 }}>

      {/* Botões scroll up/down — fixos no canto, não rolam com mensagens */}
      <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 8, zIndex: 10, pointerEvents: "auto" }}>
        <button
          type="button"
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          title="Ir pra primeira mensagem"
          style={scrollBtnStyle}
        >
          <i className="ti ti-chevrons-up" />
        </button>
        <button
          type="button"
          onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })}
          title="Ir pra mais recente"
          style={scrollBtnStyle}
        >
          <i className="ti ti-chevrons-down" />
        </button>
      </div>

      {/* Mensagens */}
      <div ref={scrollRef} className="chat-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, background: "var(--mk-surface-2)" }}>

        {msgs.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12, padding: 40 }}>Sem mensagens neste ticket.</div>
        ) : (
          msgs.map((m) => (
            <div key={m.id} className="msg-row" style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: m.autor === "cliente" ? "flex-start" : "flex-end" }}>
              {m.wa_message_id && m.autor !== "cliente" && (
                <button type="button" onClick={() => setRespondendo(m)} title="Responder" className="msg-reply-btn" style={replyBtnStyle}><i className="ti ti-arrow-back-up" /></button>
              )}
              <div
                style={{
                  maxWidth: "72%",
                  minWidth: 0,
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: m.autor === "cliente" ? "var(--mk-surface)" : "rgba(155,125,191,0.18)",
                  border: "0.5px solid var(--mk-border)",
                  color: "var(--mk-text)",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
                className="msg-bubble"
              >
                {m.metadata?.ad_referral && <CardAnuncio ad={m.metadata.ad_referral} />}
                {m.metadata?.reply_to && (() => {
                  const q = acharCitada(m.metadata.reply_to);
                  return (
                    <div style={{ borderLeft: "3px solid #9B7DBF", background: "rgba(155,125,191,0.10)", borderRadius: 6, padding: "4px 8px", marginBottom: 6, fontSize: 11, color: "var(--mk-text-secondary)" }}>
                      <div style={{ fontWeight: 600, color: "#9B7DBF", fontSize: 10 }}>{q ? (q.autor === "cliente" ? props.contatoNomeCurto || "Cliente" : "Você") : "Mensagem"}</div>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q ? previewMsg(q) : "mensagem citada"}</div>
                    </div>
                  );
                })()}
                {m.autor !== "cliente" && m.usuario_id && (
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#9B7DBF", marginBottom: 2 }}>
                    {props.userNomeMap[m.usuario_id] || "Atendente"}
                  </div>
                )}
                {m.tipo === "audio" ? (
                  m.midia_url ? (
                    <AudioPlayer midiaPath={m.midia_url} transcricao={m.transcricao} />
                  ) : (
                    <MidiaPendente mensagem={m} label="Áudio" icone="ti-microphone" />
                  )
                ) : m.tipo === "imagem" || m.tipo === "video" ? (
                  m.midia_url ? (
                    <MediaPreview midiaPath={m.midia_url} tipo={m.tipo} legenda={m.conteudo && !/^\[(imagem|video)\]$/.test(m.conteudo) ? m.conteudo : null} />
                  ) : (
                    <MidiaPendente mensagem={m} label={m.tipo === "imagem" ? "Imagem" : "Vídeo"} icone={m.tipo === "imagem" ? "ti-photo" : "ti-video"} />
                  )
                ) : m.tipo === "documento" ? (
                  m.midia_url ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--mk-text-secondary)" }}>
                        <i className="ti ti-file" /> [documento]
                      </div>
                      {m.conteudo && <div style={{ marginTop: 4 }}>{m.conteudo}</div>}
                    </>
                  ) : (
                    <MidiaPendente mensagem={m} label="Documento" icone="ti-file" />
                  )
                ) : (
                  m.conteudo || m.transcricao || `[${m.tipo}]`
                )}
                <div style={{ fontSize: 9.5, color: "var(--mk-text-muted)", marginTop: 4, textAlign: "right" }}>
                  {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
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
              {m.wa_message_id && m.autor === "cliente" && (
                <button type="button" onClick={() => setRespondendo(m)} title="Responder" className="msg-reply-btn" style={replyBtnStyle}><i className="ti ti-arrow-back-up" /></button>
              )}
            </div>
          ))
        )}
      </div>
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

      {/* Banner de resposta (citação) */}
      {respondendo && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "var(--mk-surface)", borderTop: "0.5px solid var(--mk-border)", borderLeft: "3px solid #9B7DBF" }}>
          <i className="ti ti-arrow-back-up" style={{ color: "#9B7DBF" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: "#9B7DBF" }}>Respondendo {respondendo.autor === "cliente" ? props.contatoNomeCurto || "Cliente" : "você"}</div>
            <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewMsg(respondendo)}</div>
          </div>
          <button type="button" onClick={() => setRespondendo(null)} title="Cancelar" style={{ background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", fontSize: 15 }}><i className="ti ti-x" /></button>
        </div>
      )}

      {/* Input bar nova estilo ZPRO */}
      <InputBar
        ticketId={props.ticketId}
        canalId={props.canalId}
        canalConectado={props.canalConectado}
        atendenteNome={props.usuarioAtualNome || "Atendente"}
        text={text}
        setText={setText}
        sending={sending}
        onSend={enviar}
        replyId={respondendo?.wa_message_id || null}
        onClearReply={() => setRespondendo(null)}
        onOptimisticAudio={(blob: Blob) => {
          // Optimistic add audio msg local
          const tempId = `temp_${Date.now()}`;
          const optimistic: Mensagem = {
            id: tempId,
            autor: "atendente",
            tipo: "audio",
            conteudo: null,
            transcricao: null,
            midia_url: URL.createObjectURL(blob),
            midia_mime: blob.type,
            status: "pendente",
            created_at: new Date().toISOString(),
            usuario_id: null,
          };
          setMsgs((prev) => [...prev, optimistic]);
          return tempId;
        }}
        onAudioConfirm={(tempId: string, mensagemId?: string) => {
          setMsgs((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, status: "enviada", id: mensagemId || tempId } : m)),
          );
        }}
        onAudioFail={(tempId: string) => {
          setMsgs((prev) => prev.filter((m) => m.id !== tempId));
        }}
      />
    </div>
  );
}
