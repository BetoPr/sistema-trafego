"use client";

/**
 * Shell SPA dos atendimentos — estilo ZPRO.
 * Toda interação (trocar aba, abrir ticket, abrir/fechar detalhes) é estado local
 * + fetch de API. URL fica parada em /atendimentos; zero round-trip de navegação.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Balao } from "@/components/ui/Balao";
import { ListaAtendimentos, type TicketLista } from "./_lista";
import { BolhaEspiada } from "./_espiar-msg";
import { ChatView } from "./_chat";
import { PainelDireito } from "./_painel";
import { AtenderBotao } from "./_atender-btn";

/** True quando a viewport é de celular (≤768px). Reage a resize/rotação. */
function useIsMobile(bp = 768) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [bp]);
  return m;
}

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
  filas: Array<{ id: string; nome: string; cor?: string | null; fixa?: boolean | null }>;
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
  const mobile = useIsMobile();
  // Largura da coluna de conversas — arrastável (estilo WhatsApp), persistida.
  const sectionRef = useRef<HTMLElement>(null);
  const [larguraLista, setLarguraLista] = useState(340);
  const arrastando = useRef(false);
  useEffect(() => {
    const s = localStorage.getItem("atend_largura_lista");
    if (s) setLarguraLista(Math.min(620, Math.max(260, parseInt(s, 10) || 340)));
  }, []);
  useEffect(() => {
    function move(e: PointerEvent) {
      if (!arrastando.current || !sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      setLarguraLista(Math.min(620, Math.max(260, e.clientX - rect.left)));
    }
    function up() {
      if (!arrastando.current) return;
      arrastando.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try { localStorage.setItem("atend_largura_lista", String(Math.round(larguraLista))); } catch {}
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [larguraLista]);
  const [tickets, setTickets] = useState<TicketLista[]>(p.ticketsIniciais);
  const [sel, setSel] = useState<{ ticket: TicketFull; mensagens: Mensagem[]; etiquetas: Tag[] } | null>(null);
  const [loadingSel, setLoadingSel] = useState(false);
  // Começa no chat (painel de detalhes fechado); abre só ao tocar no ícone de info
  const [detalhes, setDetalhes] = useState(false);
  const selIdRef = useRef<string | null>(null);

  const voltarLista = useCallback(() => {
    selIdRef.current = null;
    setSel(null);
  }, []);

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
    <section ref={sectionRef} style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : `${larguraLista}px 1fr`, height: "calc(100vh - 60px)", minHeight: 0, gap: 0, background: "var(--mk-bg)", position: "relative", overflow: "hidden", margin: mobile ? "-12px -14px -24px" : "-12px -28px -30px", border: "0.5px solid var(--mk-border)" }}>
      {/* Divisória arrastável conversas ↔ chat (desktop) */}
      {!mobile && (
        <div
          onPointerDown={(e) => { arrastando.current = true; e.preventDefault(); document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; }}
          onDoubleClick={() => { setLarguraLista(340); try { localStorage.setItem("atend_largura_lista", "340"); } catch {} }}
          title="Arraste pra redimensionar (2 cliques: reset)"
          className="resizer-conversas"
          style={{ position: "absolute", top: 0, bottom: 0, left: larguraLista - 3, width: 6, cursor: "col-resize", zIndex: 30 }}
        />
      )}
      <style>{`.resizer-conversas:hover, .resizer-conversas:active { background: var(--mk-accent); opacity: 0.35; }`}</style>
      {/* COLUNA 1 — Lista (no mobile some quando um ticket está aberto) */}
      <div style={{ borderRight: mobile ? "none" : "0.5px solid var(--mk-border)", display: mobile && sel ? "none" : "flex", flexDirection: "column", minHeight: 0 }}>
        <ListaAtendimentos
          tickets={tickets}
          canais={p.canais}
          filas={p.filas}
          usuarios={p.usuarios}
          todasEtiquetas={p.todasEtiquetas}
          ticketSel={sel?.ticket.id}
          initialTab={p.initialTab}
          onSelectTicket={(id) => carregarTicket(id)}
          onRefresh={refetchLista}
        />
      </div>

      {/* COLUNA 2 — Chat (no mobile some quando nenhum ticket está aberto) */}
      <main
        style={{
          display: mobile && !sel ? "none" : "flex",
          flexDirection: "column",
          minHeight: 0,
          marginRight: !mobile && sel && detalhes && sel.ticket.status !== "pendente" ? 340 : 0,
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
          <PendingView ticketId={sel.ticket.id} mensagens={sel.mensagens} contatoNome={sel.ticket.contato.nome} onBack={mobile ? voltarLista : undefined} />
        ) : (
          <ChatView
            key={sel.ticket.id}
            onBack={mobile ? voltarLista : undefined}
            ticketId={sel.ticket.id}
            ticketNumero={sel.ticket.numero}
            canalId={sel.ticket.canal?.id ?? null}
            canalConectado={sel.ticket.canal?.status === "connected"}
            contatoNome={sel.ticket.contato.nome}
            contatoNomeCurto={(sel.ticket.contato.nome.slice(0, 2) || "?").toUpperCase()}
            contatoFotoUrl={(sel.ticket.contato as { foto_url?: string | null }).foto_url ?? null}
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

      {/* COLUNA 3 — Painel direito: aside deslizante no desktop */}
      {!mobile && sel && sel.ticket.status !== "pendente" && (
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

      {/* No mobile, o painel vira bottom-sheet (balão) */}
      {mobile && sel && sel.ticket.status !== "pendente" && (
        <Balao open={detalhes} onClose={() => setDetalhes(false)} titulo="Detalhes do contato" icone="ti-info-circle" largura={460} alturaVh={90}>
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
        </Balao>
      )}
    </section>
  );
}

function PendingView({ ticketId, mensagens, contatoNome, onBack }: { ticketId: string; mensagens: Mensagem[]; contatoNome: string; onBack?: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--mk-border)", display: "flex", gap: 8, alignItems: "center" }}>
        {onBack && (
          <button onClick={onBack} title="Voltar" aria-label="Voltar" style={{ background: "transparent", border: 0, color: "var(--mk-text-secondary)", cursor: "pointer", fontSize: 18, padding: 2, marginRight: 2 }}>
            <i className="ti ti-arrow-left" />
          </button>
        )}
        <i className="ti ti-eye" style={{ color: "#10b981" }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Espiando — {contatoNome}</span>
        <div style={{ marginLeft: "auto" }}>
          <AtenderBotao ticketId={ticketId} />
        </div>
      </div>
      <div className="chat-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 18px", background: "var(--mk-surface-2)", display: "flex", flexDirection: "column", gap: 10 }}>
        {mensagens.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12, padding: 40 }}>Sem mensagens.</div>
        ) : (
          mensagens.map((m) => <BolhaEspiada key={m.id} m={m} contatoNome={contatoNome} />)
        )}
      </div>
    </div>
  );
}
