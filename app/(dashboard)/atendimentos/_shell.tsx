"use client";

/**
 * Shell SPA dos atendimentos — estilo ZPRO.
 * Toda interação (trocar aba, abrir ticket, abrir/fechar detalhes) é estado local
 * + fetch de API. URL fica parada em /atendimentos; zero round-trip de navegação.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ListaAtendimentos, type TicketLista } from "./_lista";
import { ChatView } from "./_chat";
import { PainelDireito } from "./_painel";
import { AtenderBotao } from "./_atender-btn";

interface TicketFull {
  id: string;
  numero: number;
  status: string;
  sentimento: string | null;
  sentimento_confianca: number | null;
  sentimento_motivo: string | null;
  resumo: string | null;
  resumo_atualizado_em: string | null;
  valor_fechado: number | null;
  metadata: { servico?: string; quantidade?: number } | null;
  fila_id: string | null;
  usuario_id: string | null;
  contato: { id: string; nome: string; whatsapp: string | null; ia_habilitada: boolean };
  canal: { id: string; nome: string; status: string } | null;
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
}

interface Tag {
  id: string;
  nome: string;
  cor: string;
  categoria: "etiqueta" | "flag";
}

interface Props {
  ticketsIniciais: TicketLista[];
  canais: Array<{ id: string; nome: string; status: string; numero_conectado: string | null }>;
  filas: Array<{ id: string; nome: string; cor?: string | null }>;
  usuarios: Array<{ id: string; nome: string }>;
  mensagensRapidas: Array<{ id: string; comando: string; conteudo: string }>;
  todasEtiquetas: Tag[];
  servicos: Array<{ id: string; nome: string }>;
  servicosHabilitados: boolean;
  userNomeMap: Record<string, string>;
  initialTicketId?: string;
  initialTab?: "aberto" | "pendente" | "fechado";
}

export function AtendimentosShell(p: Props) {
  const [tickets, setTickets] = useState<TicketLista[]>(p.ticketsIniciais);
  const [sel, setSel] = useState<{ ticket: TicketFull; mensagens: Mensagem[]; etiquetas: Tag[] } | null>(null);
  const [loadingSel, setLoadingSel] = useState(false);
  const [detalhes, setDetalhes] = useState(true);
  const selIdRef = useRef<string | null>(null);

  const refetchLista = useCallback(async () => {
    try {
      const r = await fetch("/api/atendimentos/lista");
      const j = await r.json();
      if (j.tickets) setTickets(j.tickets);
    } catch {}
  }, []);

  const carregarTicket = useCallback(async (id: string, silencioso = false) => {
    if (!silencioso) setLoadingSel(true);
    selIdRef.current = id;
    try {
      const r = await fetch(`/api/atendimentos/${id}/full`);
      const j = await r.json();
      // Ignora resposta se usuário já clicou em outro ticket
      if (selIdRef.current !== id) return;
      if (r.ok && j.ticket) {
        setSel({ ticket: j.ticket, mensagens: j.mensagens || [], etiquetas: j.etiquetas || [] });
      }
    } catch {} finally {
      if (!silencioso) setLoadingSel(false);
    }
  }, []);

  const refreshSel = useCallback(() => {
    if (selIdRef.current) carregarTicket(selIdRef.current, true);
    refetchLista();
  }, [carregarTicket, refetchLista]);

  // Deep link: ?t=... abre o ticket e limpa a URL
  useEffect(() => {
    if (p.initialTicketId) {
      carregarTicket(p.initialTicketId);
    }
    window.history.replaceState(null, "", "/atendimentos");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling leve: lista a cada 15s, ticket aberto junto
  useEffect(() => {
    const iv = setInterval(() => {
      refetchLista();
      if (selIdRef.current) carregarTicket(selIdRef.current, true);
    }, 15000);
    return () => clearInterval(iv);
  }, [refetchLista, carregarTicket]);

  const filaNome = sel?.ticket.fila_id ? p.filas.find((f) => f.id === sel.ticket.fila_id)?.nome ?? null : null;
  const userNome = sel?.ticket.usuario_id ? p.userNomeMap[sel.ticket.usuario_id] ?? null : null;

  return (
    <section style={{ display: "grid", gridTemplateColumns: "340px 1fr", height: "calc(100vh - 60px)", minHeight: 0, gap: 0, background: "var(--mk-bg)", position: "relative", overflow: "hidden", margin: "-12px -28px -30px", border: "0.5px solid var(--mk-border)" }}>
      {/* COLUNA 1 — Lista */}
      <div style={{ borderRight: "0.5px solid var(--mk-border)", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ListaAtendimentos
          tickets={tickets}
          canais={p.canais}
          ticketSel={sel?.ticket.id}
          initialTab={p.initialTab}
          onSelectTicket={(id) => carregarTicket(id)}
          onRefresh={refetchLista}
        />
      </div>

      {/* COLUNA 2 — Chat */}
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          marginRight: sel && detalhes && sel.ticket.status !== "pendente" ? 340 : 0,
          transition: "margin-right 280ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {!sel ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--mk-text-muted)", fontSize: 13 }}>
            <div style={{ textAlign: "center" }}>
              {loadingSel ? (
                <>
                  <i className="ti ti-loader-2" style={{ fontSize: 36, animation: "spin 1s linear infinite", display: "inline-block" }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                  <div style={{ marginTop: 12 }}>Carregando conversa…</div>
                </>
              ) : (
                <>
                  <i className="ti ti-messages" style={{ fontSize: 48, opacity: 0.5 }} />
                  <div style={{ marginTop: 12 }}>Selecione um ticket à esquerda.</div>
                </>
              )}
            </div>
          </div>
        ) : sel.ticket.status === "pendente" ? (
          <PendingView ticketId={sel.ticket.id} mensagens={sel.mensagens} contatoNome={sel.ticket.contato.nome} />
        ) : (
          <ChatView
            key={sel.ticket.id}
            ticketId={sel.ticket.id}
            ticketNumero={sel.ticket.numero}
            canalId={sel.ticket.canal?.id ?? null}
            canalConectado={sel.ticket.canal?.status === "connected"}
            contatoNome={sel.ticket.contato.nome}
            contatoNomeCurto={(sel.ticket.contato.nome.slice(0, 2) || "?").toUpperCase()}
            contatoTelefone={sel.ticket.contato.whatsapp}
            filaAtualNome={filaNome}
            usuarioAtualNome={userNome}
            filas={p.filas}
            usuarios={p.usuarios}
            canais={p.canais}
            detalhesAbertos={detalhes}
            onToggleDetalhes={() => setDetalhes((d) => !d)}
            onRefresh={refreshSel}
            servicos={p.servicos}
            servicosHabilitados={p.servicosHabilitados}
            mensagensIniciais={sel.mensagens}
            mensagensRapidas={p.mensagensRapidas}
            userNomeMap={p.userNomeMap}
          />
        )}
      </main>

      {/* COLUNA 3 — Painel direito (slide animado) */}
      {sel && sel.ticket.status !== "pendente" && (
        <aside
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 340,
            borderLeft: "0.5px solid var(--mk-border)",
            display: "flex",
            flexDirection: "column",
            background: "var(--mk-bg)",
            transform: detalhes ? "translateX(0)" : "translateX(100%)",
            opacity: detalhes ? 1 : 0,
            transition: "transform 280ms cubic-bezier(0.4, 0, 0.2, 1), opacity 220ms",
            boxShadow: detalhes ? "-4px 0 12px rgba(0,0,0,0.08)" : "none",
            zIndex: 10,
          }}
        >
          <PainelDireito
            key={sel.ticket.id}
            ticket={sel.ticket}
            contato={sel.ticket.contato}
            etiquetas={sel.etiquetas}
            todasEtiquetas={p.todasEtiquetas}
            servicos={p.servicos}
            servicosHabilitados={p.servicosHabilitados}
            onFechar={() => setDetalhes(false)}
            onRefresh={refreshSel}
          />
        </aside>
      )}
    </section>
  );
}

function PendingView({ ticketId, mensagens, contatoNome }: { ticketId: string; mensagens: Mensagem[]; contatoNome: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--mk-border)", display: "flex", gap: 8, alignItems: "center" }}>
        <i className="ti ti-eye" style={{ color: "#C9A876" }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Espiando — {contatoNome}</span>
        <div style={{ marginLeft: "auto" }}>
          <AtenderBotao ticketId={ticketId} />
        </div>
      </div>
      <div className="chat-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 18px", background: "var(--mk-surface-2)", display: "flex", flexDirection: "column", gap: 10 }}>
        {mensagens.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12, padding: 40 }}>Sem mensagens.</div>
        ) : (
          mensagens.map((m) => (
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
                <div style={{ fontSize: 9.5, fontWeight: 600, color: m.autor === "cliente" ? "#9B7DBF" : "#5B8BA6", marginBottom: 3 }}>
                  {m.autor === "cliente" ? contatoNome : "Atendente"}
                </div>
                {m.tipo === "audio" ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--mk-text-secondary)", fontSize: 12 }}>
                      <i className="ti ti-microphone" /> Áudio
                    </div>
                    {m.transcricao && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "var(--mk-text-muted)", fontStyle: "italic", borderLeft: "2px solid var(--mk-accent)", paddingLeft: 6 }}>
                        <div style={{ fontSize: 9.5, color: "var(--mk-accent)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>📝 TRANSCRIÇÃO</div>
                        {m.transcricao}
                      </div>
                    )}
                  </>
                ) : (
                  m.conteudo || m.transcricao || `[${m.tipo}]`
                )}
                <div style={{ fontSize: 9.5, color: "var(--mk-text-muted)", marginTop: 4, textAlign: "right" }}>
                  {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
