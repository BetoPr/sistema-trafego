"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Balao } from "@/components/ui/Balao";
import { AtenderBotao } from "./_atender-btn";

export interface TicketLista {
  id: string;
  numero: number;
  status: string;
  ultima_mensagem_em: string | null;
  ultima_mensagem_preview: string | null;
  sentimento: string | null;
  contato: {
    id: string;
    nome: string;
    whatsapp: string | null;
    foto_url: string | null;
    contato_etiquetas?: Array<{ etiqueta: { id: string; nome: string; cor: string; categoria?: string | null } | null } | null> | null;
  } | null;
  canal: { id: string; nome: string; status: string; instance_id: string | null } | null;
  fila: { id: string; nome: string; cor: string } | null;
}

interface Canal {
  id: string;
  nome: string;
  status: string;
  numero_conectado: string | null;
}

interface Props {
  tickets: TicketLista[];
  canais: Canal[];
  ticketSel: string | undefined;
  initialTab?: "aberto" | "pendente" | "fechado";
  onSelectTicket: (id: string) => void;
  onRefresh: () => void;
}

const TABS: Array<{ id: "aberto" | "pendente" | "fechado"; label: string }> = [
  { id: "aberto", label: "Abertos" },
  { id: "pendente", label: "Pendentes" },
  { id: "fechado", label: "Fechados" },
];

export function ListaAtendimentos(p: Props) {
  const [tab, setTab] = useState<"aberto" | "pendente" | "fechado">(p.initialTab || "aberto");
  // "agora" pra calcular tempo relativo (só após montar, evita mismatch de hidratação); atualiza a cada 60s
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const iv = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(iv);
  }, []);
  const [canalFiltro, setCanalFiltro] = useState<string | null>(null);
  const [etiquetaFiltros, setEtiquetaFiltros] = useState<string[]>([]);
  const toggleEtiquetaFiltro = (id: string) => setEtiquetaFiltros((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [searchModal, setSearchModal] = useState(false);
  const [fechamentosModal, setFechamentosModal] = useState(false);
  const [fechamentos, setFechamentos] = useState<Array<{ ticketId: string; numero: number; valor: number; servico: string | null; quantidade: number | null; fechado_em: string | null; contato_nome: string; fechado_por: string | null }>>([]);
  const [fechamentosLoading, setFechamentosLoading] = useState(false);
  const [tipoConexao, setTipoConexao] = useState<"connected" | "connecting" | "disconnected">("connected");
  const [showCanais, setShowCanais] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchMsgText, setSearchMsgText] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; numero: number; contato_nome: string; conteudo: string; created_at: string; ticketId: string }>>([]);
  const [aba, setAba] = useState<"privados" | "grupos">("privados");
  const [espiar, setEspiar] = useState<null | { ticketId: string; numero: number; contatoNome: string }>(null);
  const [espiarMsgs, setEspiarMsgs] = useState<Array<{ id: string; autor: string; tipo: string; conteudo: string | null; transcricao: string | null; created_at: string }>>([]);
  const [espiarLoading, setEspiarLoading] = useState(false);
  const canaisRef = useRef<HTMLDivElement>(null);

  async function abrirEspiar(t: TicketLista) {
    setEspiar({ ticketId: t.id, numero: t.numero, contatoNome: t.contato?.nome || "—" });
    setEspiarMsgs([]);
    setEspiarLoading(true);
    try {
      const r = await fetch(`/api/atendimentos/${t.id}/full`);
      const j = await r.json();
      setEspiarMsgs(j.mensagens || []);
    } catch {} finally {
      setEspiarLoading(false);
    }
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (canaisRef.current && !canaisRef.current.contains(e.target as Node)) setShowCanais(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Filtragem 100% client-side — instantânea
  const temEtiqueta = (t: TicketLista, etqId: string) =>
    (t.contato?.contato_etiquetas || []).some((ce) => ce?.etiqueta?.id === etqId);

  // Etiquetas presentes nos tickets atuais (pra montar o filtro)
  const etiquetasDisponiveis = useMemo(() => {
    const m = new Map<string, { id: string; nome: string; cor: string }>();
    for (const t of p.tickets) {
      for (const ce of t.contato?.contato_etiquetas || []) {
        const e = ce?.etiqueta;
        if (e && (e.categoria || "etiqueta") === "etiqueta" && !m.has(e.id)) m.set(e.id, { id: e.id, nome: e.nome, cor: e.cor });
      }
    }
    return Array.from(m.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [p.tickets]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { aberto: 0, pendente: 0, fechado: 0 };
    for (const t of p.tickets) {
      if (canalFiltro && t.canal?.id !== canalFiltro) continue;
      if (etiquetaFiltros.length && !etiquetaFiltros.some((id) => temEtiqueta(t, id))) continue;
      if (c[t.status] !== undefined) c[t.status]++;
    }
    return c;
  }, [p.tickets, canalFiltro, etiquetaFiltros]);

  const ticketsVisiveis = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return p.tickets.filter((t) => {
      if (t.status !== tab) return false;
      if (canalFiltro && t.canal?.id !== canalFiltro) return false;
      if (etiquetaFiltros.length && !etiquetaFiltros.some((id) => temEtiqueta(t, id))) return false;
      if (q) {
        const alvo = `${t.contato?.nome || ""} ${t.contato?.whatsapp || ""} ${t.numero}`.toLowerCase();
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [p.tickets, tab, canalFiltro, etiquetaFiltros, searchQ]);

  async function buscarMensagens() {
    if (!searchMsgText.trim()) return;
    try {
      const r = await fetch(`/api/atendimentos/buscar-mensagens?q=${encodeURIComponent(searchMsgText)}`);
      const j = await r.json();
      setSearchResults(j.resultados || []);
    } catch {}
  }

  async function abrirFechamentos() {
    setFechamentosModal(true);
    setFechamentosLoading(true);
    try {
      const r = await fetch("/api/atendimentos/fechamentos");
      const j = await r.json();
      setFechamentos(j.fechamentos || []);
    } catch {} finally {
      setFechamentosLoading(false);
    }
  }

  async function excluirFechamento(ticketId: string, contatoNome: string, valor: number) {
    const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
    if (!confirm(`Excluir fechamento de ${brl} (${contatoNome})? Some do Dashboard também.`)) return;
    try {
      const r = await fetch(`/api/atendimentos/${ticketId}/fechamento`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { alert(`Erro: ${j.error || r.statusText}`); return; }
      setFechamentos((prev) => prev.filter((f) => f.ticketId !== ticketId));
      p.onRefresh();
    } catch (e) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function refresh() {
    setRefreshing(true);
    p.onRefresh();
    setTimeout(() => setRefreshing(false), 800);
  }

  function ciclarTipoConexao() {
    setTipoConexao((t) => (t === "connected" ? "connecting" : t === "connecting" ? "disconnected" : "connected"));
  }

  const canaisConectados = p.canais.filter((c) => c.status === "connected");
  const canaisConectando = p.canais.filter((c) => c.status === "pending_qr" || c.status === "connecting");
  const canaisDesconectados = p.canais.filter((c) => c.status === "disconnected" || c.status === "error");

  const conexaoConfig = {
    connected: { icon: "ti-wifi", color: "#10b981", bg: "rgba(16,185,129,0.18)", border: "#10b981", lista: canaisConectados, label: "Conectado" },
    connecting: { icon: "ti-qrcode", color: "#10b981", bg: "rgba(16,185,129,0.18)", border: "#10b981", lista: canaisConectando, label: "Conectando" },
    disconnected: { icon: "ti-wifi-off", color: "#C97064", bg: "rgba(201,112,100,0.18)", border: "#C97064", lista: canaisDesconectados, label: "Desconectado" },
  }[tipoConexao];

  return (
    <aside style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "var(--mk-bg)" }}>
      {/* Header título + filtros */}
      <div style={sep}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", gap: 6 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--mk-text)", flex: 1 }}>Atendimentos</h2>
          <button onClick={abrirFechamentos} className="ghost-btn" style={btnHdr} title="Log de fechamentos">
            <i className="ti ti-receipt-2" />
          </button>
          <button onClick={() => setFiltroAberto(true)} className="ghost-btn" style={btnHdr} title="Filtros">
            <i className="ti ti-filter" /> Filtros
          </button>
        </div>
      </div>

      {/* Tabs Privados/Grupos */}
      <div style={sep}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "6px 10px", gap: 6 }}>
          <button onClick={() => setAba("privados")} style={tabPill(aba === "privados")}>Privados</button>
          <button onClick={() => setAba("grupos")} style={tabPill(aba === "grupos")}>Grupos</button>
        </div>
      </div>

      {/* Busca + Buscar msg + Indicador canais + Refresh */}
      <div style={sep}>
        <div style={{ display: "flex", alignItems: "center", padding: "8px 10px", gap: 4 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--mk-text-muted)", fontSize: 12 }} />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Buscar nome, número, ticket…"
              style={{ width: "100%", padding: "6px 8px 6px 28px", borderRadius: 6, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 11.5 }}
            />
          </div>
          <button onClick={() => setSearchModal(true)} title="Buscar mensagem" style={iconBtn}>
            <i className="ti ti-message-search" />
          </button>
          <div ref={canaisRef} style={{ position: "relative" }}>
            <button
              onClick={ciclarTipoConexao}
              onMouseEnter={() => setShowCanais(true)}
              onMouseLeave={() => setShowCanais(false)}
              title={`${conexaoConfig.label}: ${conexaoConfig.lista.length}`}
              style={{ ...iconBtn, border: `1px solid ${conexaoConfig.border}`, color: conexaoConfig.color, background: conexaoConfig.bg, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}
            >
              <i className={`ti ${conexaoConfig.icon}`} />{conexaoConfig.lista.length}
            </button>
            {showCanais && (
              <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "var(--mk-bg)", border: "0.5px solid var(--mk-border)", borderRadius: 8, padding: "6px 10px", minWidth: 180, zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: conexaoConfig.color, marginBottom: 4 }}>
                  {conexaoConfig.lista.length} · {conexaoConfig.label}
                </div>
                {conexaoConfig.lista.length === 0 ? (
                  <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>—</div>
                ) : (
                  conexaoConfig.lista.map((c) => (
                    <div key={c.id} style={{ fontSize: 10.5, color: "var(--mk-text-secondary)", padding: "2px 0" }}>
                      • {c.nome}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <button onClick={refresh} title="Atualizar" style={iconBtn}>
            <i className={`ti ti-refresh ${refreshing ? "spin" : ""}`} style={{ animation: refreshing ? "spin 0.6s linear" : undefined }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </button>
        </div>
      </div>

      {/* Chips filtros aplicados */}
      {(canalFiltro || etiquetaFiltros.length > 0) && (
        <div style={sep}>
          <div style={{ display: "flex", gap: 4, padding: "8px 12px", flexWrap: "wrap" }}>
            {canalFiltro && (
              <span style={chipActive}>
                {p.canais.find((c) => c.id === canalFiltro)?.nome || "Canal"}
                <button onClick={() => setCanalFiltro(null)} style={{ marginLeft: 4, background: "transparent", border: 0, color: "inherit", cursor: "pointer" }}>×</button>
              </span>
            )}
            {etiquetaFiltros.map((id) => {
              const e = etiquetasDisponiveis.find((x) => x.id === id);
              return (
                <span key={id} style={chipActive}>
                  <i className="ti ti-tag" style={{ color: e?.cor }} /> {e?.nome || "Etiqueta"}
                  <button onClick={() => toggleEtiquetaFiltro(id)} style={{ marginLeft: 4, background: "transparent", border: 0, color: "inherit", cursor: "pointer" }}>×</button>
                </span>
              );
            })}
            <button onClick={() => { setCanalFiltro(null); setEtiquetaFiltros([]); }} style={{ ...chipBtn, cursor: "pointer", border: 0 }}>Limpar <i className="ti ti-x" /></button>
          </div>
        </div>
      )}

      {/* Tabs status — troca instantânea, sem navegação */}
      <div style={sep}>
        <div style={{ display: "flex", padding: "6px 8px", gap: 4 }}>
          {TABS.map((t) => {
            const ativo = t.id === tab;
            const cor = t.id === "aberto" ? "#10b981" : t.id === "pendente" ? "#10b981" : "var(--mk-text-muted)";
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  borderRadius: 6,
                  textAlign: "center",
                  background: ativo ? "var(--mk-surface)" : "transparent",
                  border: ativo ? `0.5px solid ${cor}` : "0.5px solid transparent",
                  color: ativo ? cor : "var(--mk-text-muted)",
                  fontSize: 11,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  cursor: "pointer",
                }}
              >
                <i className={`ti ${t.id === "aberto" ? "ti-message" : t.id === "pendente" ? "ti-clock" : "ti-check"}`} />
                {t.label}
                <span style={{ fontSize: 9.5, background: cor, color: "#FFFDF8", borderRadius: 8, padding: "0 5px", marginLeft: 2 }}>{counts[t.id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista tickets */}
      <div className="chat-scroll" style={{ flex: 1, overflowY: "auto" }}>
        {ticketsVisiveis.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12 }}>Sem tickets.</div>
        ) : (
          ticketsVisiveis.map((t) => {
            const c = t.contato;
            const f = t.fila;
            const isOpen = t.id === p.ticketSel;
            return (
              <button
                key={t.id}
                onClick={() => p.onSelectTicket(t.id)}
                style={{
                  display: "flex",
                  gap: 10,
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 14px",
                  borderTop: 0,
                  borderRight: 0,
                  borderBottom: "0.5px solid var(--mk-border)",
                  color: "var(--mk-text)",
                  background: isOpen ? "var(--mk-surface)" : "transparent",
                  borderLeft: isOpen ? "2px solid var(--mk-accent)" : "2px solid transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <AvatarContato nome={c?.nome} foto={c?.foto_url} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flexShrink: 1 }}>{c?.nome || c?.whatsapp || "—"}</span>
                    {/* Ícones das etiquetas aplicadas (só cor, sem texto) */}
                    {(c?.contato_etiquetas || [])
                      .map((ce) => ce?.etiqueta)
                      .filter((e): e is { id: string; nome: string; cor: string; categoria?: string | null } => !!e && (e.categoria || "etiqueta") === "etiqueta")
                      .slice(0, 4)
                      .map((e) => (
                        <i key={e.id} className="ti ti-tag" title={e.nome} style={{ fontSize: 13, color: e.cor, flexShrink: 0 }} />
                      ))}
                    <span style={{ flex: 1 }} />
                    {t.status === "pendente" && (
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); abrirEspiar(t); }}
                        title="Espiar conversa"
                        style={{ color: "#10b981", fontSize: 14, padding: "0 2px", cursor: "pointer" }}
                      >
                        <i className="ti ti-eye" />
                      </span>
                    )}
                    {now > 0 && t.ultima_mensagem_em && (
                      <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>{tempoRel(t.ultima_mensagem_em, now)}</span>
                    )}
                    <span style={{ fontSize: 10, color: "var(--mk-text-muted)", fontFamily: "monospace" }}>#{t.numero}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.ultima_mensagem_preview || "—"}
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                    {f && <span style={{ fontSize: 9.5, padding: "1px 5px", borderRadius: 3, background: `${f.cor}22`, color: f.cor, border: `0.5px solid ${f.cor}` }}>{f.nome}</span>}
                    {t.canal && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(37,211,102,0.12)", color: "#25D366" }}>{t.canal.nome}</span>}
                    {t.sentimento === "muito_bom" && <span style={{ fontSize: 9.5, color: "#10b981" }}>● ótimo</span>}
                    {t.sentimento === "ruim" && <span style={{ fontSize: 9.5, color: "#C97064" }}>● ruim</span>}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Modal Buscar Mensagem */}
      {searchModal && (
        <div style={modalOverlay} onClick={() => setSearchModal(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "0.5px solid var(--mk-border)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>
                <i className="ti ti-message-search" style={{ marginRight: 6, color: "var(--mk-accent)" }} />
                Buscar mensagens em todos os tickets
              </h3>
              <button onClick={() => setSearchModal(false)} style={modalCloseBtn}><i className="ti ti-x" /></button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={searchMsgText}
                  onChange={(e) => setSearchMsgText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") buscarMensagens(); }}
                  placeholder="Digite um termo para buscar"
                  autoFocus
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 13 }}
                />
                <button onClick={buscarMensagens} className="cta-btn"><i className="ti ti-search" /> Buscar</button>
              </div>
              <div className="chat-scroll" style={{ marginTop: 14, maxHeight: 400, overflowY: "auto" }}>
                {searchResults.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--mk-text-muted)", padding: 30, fontSize: 12 }}>
                    {searchMsgText ? "Sem resultados" : "Digite um termo pra buscar"}
                  </div>
                ) : (
                  searchResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => { setSearchModal(false); p.onSelectTicket(r.ticketId); }}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface)", marginBottom: 6, color: "var(--mk-text)", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-accent)" }}>#{r.numero} · {r.contato_nome}</div>
                      <div style={{ fontSize: 11.5, marginTop: 4, color: "var(--mk-text-secondary)" }}>{r.conteudo.slice(0, 200)}</div>
                      <div style={{ fontSize: 10, color: "var(--mk-text-muted)", marginTop: 4 }}>{new Date(r.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Filtros */}
      {filtroAberto && (
        <div style={modalOverlay} onClick={() => setFiltroAberto(false)}>
          <div style={{ ...modalBox, width: "min(380px, 92vw)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "0.5px solid var(--mk-border)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, flex: 1 }}><i className="ti ti-filter" style={{ marginRight: 6 }} /> Filtros</h3>
              <button onClick={() => setFiltroAberto(false)} style={modalCloseBtn}><i className="ti ti-x" /></button>
            </div>
            <div className="chat-scroll" style={{ padding: 16, overflowY: "auto", flex: 1, minHeight: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text-muted)", marginBottom: 6, letterSpacing: 0.4 }}>STATUS</div>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setFiltroAberto(false); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 0", fontSize: 12.5, color: t.id === tab ? "var(--mk-accent)" : "var(--mk-text-secondary)", background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {t.id === tab ? "● " : "○ "}{t.label} <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>({counts[t.id]})</span>
                </button>
              ))}

              <div style={{ borderTop: "0.5px solid var(--mk-border)", marginTop: 12, paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text-muted)", marginBottom: 6, letterSpacing: 0.4 }}>CANAIS</div>
                <button
                  onClick={() => { setCanalFiltro(null); setFiltroAberto(false); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 0", fontSize: 12, color: !canalFiltro ? "var(--mk-accent)" : "var(--mk-text-secondary)", background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {!canalFiltro ? "● " : "○ "}Todos canais
                </button>
                {p.canais.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCanalFiltro(c.id); setFiltroAberto(false); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 0", fontSize: 12, color: canalFiltro === c.id ? "var(--mk-accent)" : "var(--mk-text-secondary)", background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {canalFiltro === c.id ? "● " : "○ "}{c.status === "connected" ? "🟢" : "🔴"} {c.nome}
                  </button>
                ))}
              </div>

              {etiquetasDisponiveis.length > 0 && (
                <div style={{ borderTop: "0.5px solid var(--mk-border)", marginTop: 12, paddingTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text-muted)", letterSpacing: 0.4 }}>ETIQUETAS</span>
                    {etiquetaFiltros.length > 0 && (
                      <button onClick={() => setEtiquetaFiltros([])} style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--mk-accent)", background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }}>Limpar ({etiquetaFiltros.length})</button>
                    )}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginBottom: 6 }}>Marque uma ou mais (mostra quem tiver qualquer uma).</div>
                  {etiquetasDisponiveis.map((e) => {
                    const on = etiquetaFiltros.includes(e.id);
                    return (
                      <button
                        key={e.id}
                        onClick={() => toggleEtiquetaFiltro(e.id)}
                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "7px 0", fontSize: 12, color: on ? "var(--mk-text)" : "var(--mk-text-secondary)", background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        <i className={`ti ${on ? "ti-square-check-filled" : "ti-square"}`} style={{ fontSize: 16, color: on ? "var(--mk-accent)" : "var(--mk-text-muted)" }} />
                        <i className="ti ti-tag" style={{ color: e.cor }} /> {e.nome}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Log de Fechamentos */}
      {fechamentosModal && (
        <div style={modalOverlay} onClick={() => setFechamentosModal(false)}>
          <div style={{ ...modalBox, width: "min(560px, 94vw)", maxHeight: "78vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "0.5px solid var(--mk-border)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, flex: 1 }}><i className="ti ti-receipt-2" style={{ marginRight: 6 }} /> Log de fechamentos</h3>
              <button onClick={() => setFechamentosModal(false)} style={modalCloseBtn}><i className="ti ti-x" /></button>
            </div>
            <div className="chat-scroll" style={{ overflowY: "auto", padding: "10px 14px" }}>
              {fechamentosLoading ? (
                <div style={{ textAlign: "center", padding: 30, fontSize: 12, color: "var(--mk-text-muted)" }}>Carregando…</div>
              ) : fechamentos.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, fontSize: 12, color: "var(--mk-text-muted)" }}>
                  <i className="ti ti-receipt-off" style={{ display: "block", fontSize: 26, marginBottom: 6, opacity: 0.6 }} />
                  Nenhum fechamento registrado ainda.
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 4px 10px", fontSize: 11.5, color: "var(--mk-text-secondary)" }}>
                    <span>{fechamentos.length} fechamento{fechamentos.length === 1 ? "" : "s"}</span>
                    <strong style={{ color: "#10b981" }}>
                      Total: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(fechamentos.reduce((s, f) => s + f.valor, 0))}
                    </strong>
                  </div>
                  {fechamentos.map((f) => (
                    <div
                      key={f.ticketId}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 8px", borderBottom: "0.5px solid var(--mk-border)" }}
                    >
                      <button
                        onClick={() => { setFechamentosModal(false); p.onSelectTicket(f.ticketId); }}
                        style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: 0, color: "var(--mk-text)", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                        title="Abrir conversa"
                      >
                        <i className="ti ti-circle-check" style={{ color: "#10b981", fontSize: 16 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {f.contato_nome} <span style={{ color: "var(--mk-text-muted)", fontWeight: 400 }}>#{f.numero}</span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 1 }}>
                            {f.servico || "Sem serviço"}{f.quantidade != null && ` × ${f.quantidade}`}
                            {f.fechado_em && ` · ${new Date(f.fechado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}`}
                            {f.fechado_por && ` · ${f.fechado_por}`}
                          </div>
                        </div>
                      </button>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981", whiteSpace: "nowrap" }}>
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(f.valor)}
                      </div>
                      <button
                        onClick={() => excluirFechamento(f.ticketId, f.contato_nome, f.valor)}
                        title="Excluir fechamento"
                        style={{ background: "transparent", border: 0, color: "#C97064", cursor: "pointer", fontSize: 14, padding: "4px 6px" }}
                      >
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Balão espiar conversa (pendentes) */}
      <Balao
        open={!!espiar}
        onClose={() => setEspiar(null)}
        titulo={espiar ? <>Espiando — {espiar.contatoNome} <span style={{ color: "var(--mk-text-muted)", fontWeight: 400, fontFamily: "monospace", fontSize: 11 }}>#{espiar.numero}</span></> : ""}
        icone="ti-eye"
        largura={560}
        footer={espiar && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <AtenderBotao ticketId={espiar.ticketId} />
          </div>
        )}
      >
        {espiarLoading ? (
          <div style={{ textAlign: "center", padding: 30, fontSize: 12, color: "var(--mk-text-muted)" }}>Carregando conversa…</div>
        ) : espiarMsgs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, fontSize: 12, color: "var(--mk-text-muted)" }}>Sem mensagens neste ticket.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {espiarMsgs.map((m) => (
              <div key={m.id} style={{ display: "flex", justifyContent: m.autor === "cliente" ? "flex-start" : "flex-end" }}>
                <div style={{ maxWidth: "78%", minWidth: 0, padding: "7px 11px", borderRadius: 10, background: m.autor === "cliente" ? "var(--mk-surface)" : "rgba(155,125,191,0.18)", border: "0.5px solid var(--mk-border)", color: "var(--mk-text)", fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                  {m.tipo === "audio" ? (
                    <>
                      <span style={{ color: "var(--mk-text-secondary)" }}><i className="ti ti-microphone" /> Áudio</span>
                      {m.transcricao && <div style={{ marginTop: 4, fontSize: 11, color: "var(--mk-text-muted)", fontStyle: "italic" }}>{m.transcricao}</div>}
                    </>
                  ) : m.tipo === "imagem" ? (
                    <span style={{ color: "var(--mk-text-secondary)" }}><i className="ti ti-photo" /> Imagem{m.conteudo ? ` — ${m.conteudo}` : ""}</span>
                  ) : (
                    m.conteudo || m.transcricao || `[${m.tipo}]`
                  )}
                  <div style={{ fontSize: 9, color: "var(--mk-text-muted)", marginTop: 3, textAlign: "right" }}>
                    {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Balao>
    </aside>
  );
}

const sep: React.CSSProperties = { borderBottom: "0.5px solid var(--mk-border)" };
const iconBtn: React.CSSProperties = { background: "var(--mk-surface-2)", border: "0.5px solid var(--mk-border)", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "var(--mk-text-secondary)", fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center" };
const btnHdr: React.CSSProperties = { fontSize: 11, padding: "5px 10px" };

function tabPill(ativo: boolean): React.CSSProperties {
  return {
    padding: "8px 6px",
    borderRadius: 6,
    border: 0,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "inherit",
    background: ativo ? "var(--mk-text)" : "transparent",
    color: ativo ? "var(--mk-bg)" : "var(--mk-text-muted)",
  };
}

const chipBtn: React.CSSProperties = { fontSize: 10.5, padding: "3px 8px", borderRadius: 10, background: "var(--mk-surface-2)", color: "var(--mk-text-secondary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit" };
const chipActive: React.CSSProperties = { fontSize: 10.5, padding: "3px 8px", borderRadius: 10, background: "rgba(16,185,129,0.18)", color: "#10b981", border: "0.5px solid #10b981", display: "inline-flex", alignItems: "center" };

const modalOverlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, backdropFilter: "blur(2px)" };
const modalBox: React.CSSProperties = { background: "var(--mk-bg)", border: "0.5px solid var(--mk-border)", borderRadius: 14, width: "min(560px, 92vw)", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" };
/** Tempo desde o último contato, compacto: agora / 1m / 1h / 1d / 1sem. */
function tempoRel(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}sem`;
}

/** Avatar do contato: foto do WhatsApp com fallback pras iniciais (foto pode expirar). */
function AvatarContato({ nome, foto }: { nome?: string | null; foto?: string | null }) {
  const [erro, setErro] = useState(false);
  const ini = nome?.slice(0, 2).toUpperCase() || "?";
  if (foto && !erro) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt="" onError={() => setErro(true)} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, background: "var(--mk-surface-2)" }} />;
  }
  return (
    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(155,125,191,0.18)", color: "#9B7DBF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 600, flexShrink: 0 }}>
      {ini}
    </div>
  );
}

const modalCloseBtn: React.CSSProperties = { background: "var(--mk-surface)", border: "0.5px solid var(--mk-border)", borderRadius: "50%", width: 28, height: 28, color: "var(--mk-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
