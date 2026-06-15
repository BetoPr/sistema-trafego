"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Balao } from "@/components/ui/Balao";
import { LightboxFoto } from "@/components/ui/LightboxFoto";
import { AtenderBotao } from "./_atender-btn";

export interface TicketLista {
  id: string;
  numero: number;
  status: string;
  ultima_mensagem_em: string | null;
  ultima_mensagem_preview: string | null;
  sentimento: string | null;
  created_at?: string | null;
  usuario_id?: string | null;
  nao_lido?: boolean;
  nao_lidas?: number;
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
  filas?: Array<{ id: string; nome: string; cor?: string | null }>;
  usuarios?: Array<{ id: string; nome: string }>;
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
  const [statusSel, setStatusSel] = useState<string[]>(p.initialTab ? [p.initialTab] : ["aberto", "pendente"]);
  const toggleStatus = (s: string) => setStatusSel((a) => (a.includes(s) ? a.filter((x) => x !== s) : [...a, s]));
  const [somenteNaoLidos, setSomenteNaoLidos] = useState(false);
  const [inverterOrdem, setInverterOrdem] = useState(false);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [somOn, setSomOn] = useState(true);
  useEffect(() => { setSomOn(localStorage.getItem("notif_som") !== "off"); }, []);
  const toggleSom = () => setSomOn((v) => { const nv = !v; localStorage.setItem("notif_som", nv ? "on" : "off"); return nv; });
  // "agora" pra calcular tempo relativo (só após montar, evita mismatch de hidratação); atualiza a cada 60s
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const iv = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(iv);
  }, []);
  const [canalFiltros, setCanalFiltros] = useState<string[]>([]);
  const toggleCanal = (id: string) => setCanalFiltros((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const [filaFiltros, setFilaFiltros] = useState<string[]>([]);
  const toggleFila = (id: string) => setFilaFiltros((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const [usuarioFiltros, setUsuarioFiltros] = useState<string[]>([]);
  const toggleUsuario = (id: string) => setUsuarioFiltros((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const [etiquetaFiltros, setEtiquetaFiltros] = useState<string[]>([]);
  const toggleEtiquetaFiltro = (id: string) => setEtiquetaFiltros((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  const limparFiltros = () => { setSomenteNaoLidos(false); setInverterOrdem(false); setDe(""); setAte(""); setCanalFiltros([]); setFilaFiltros([]); setUsuarioFiltros([]); setEtiquetaFiltros([]); setStatusSel(["aberto", "pendente"]); };
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
  const PAGE_SIZE = 20;
  const [limite, setLimite] = useState(PAGE_SIZE);
  const sentinelaRef = useRef<HTMLDivElement>(null);
  const [espiar, setEspiar] = useState<null | { ticketId: string; numero: number; contatoNome: string }>(null);
  const [espiarMsgs, setEspiarMsgs] = useState<Array<{ id: string; autor: string; tipo: string; conteudo: string | null; transcricao: string | null; created_at: string }>>([]);
  const [espiarLoading, setEspiarLoading] = useState(false);
  const canaisRef = useRef<HTMLDivElement>(null);

  // Reset paginação quando muda qualquer filtro/aba
  useEffect(() => {
    setLimite(PAGE_SIZE);
  }, [statusSel, searchQ, somenteNaoLidos, inverterOrdem, de, ate, canalFiltros, filaFiltros, usuarioFiltros, etiquetaFiltros, aba]);

  // Infinite scroll: observer no sentinel — quando aparece, +20
  useEffect(() => {
    const el = sentinelaRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setLimite((l) => l + PAGE_SIZE);
      }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [limite]);

  async function atenderDireto(ticketId: string) {
    try {
      const r = await fetch(`/api/atendimentos/${ticketId}/atender`, { method: "POST" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(`Falha: ${j.error || r.statusText}`);
        return;
      }
      // Seleciona o ticket e recarrega lista (já abre direto na conversa)
      p.onSelectTicket(ticketId);
      p.onRefresh();
    } catch (e) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

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

  // Aplica todos os filtros MENOS o status (pra contar por status no painel)
  const passaNaoStatus = (t: TicketLista, q: string) => {
    if (somenteNaoLidos && !t.nao_lido) return false;
    if (canalFiltros.length && !(t.canal && canalFiltros.includes(t.canal.id))) return false;
    if (filaFiltros.length && !(t.fila && filaFiltros.includes(t.fila.id))) return false;
    if (usuarioFiltros.length && !(t.usuario_id && usuarioFiltros.includes(t.usuario_id))) return false;
    if (etiquetaFiltros.length && !etiquetaFiltros.some((id) => temEtiqueta(t, id))) return false;
    if (de || ate) {
      const ref = t.ultima_mensagem_em || t.created_at || null;
      if (!ref) return false;
      const d = new Date(ref).getTime();
      if (de && d < new Date(`${de}T00:00:00`).getTime()) return false;
      if (ate && d > new Date(`${ate}T23:59:59.999`).getTime()) return false;
    }
    if (q) {
      const alvo = `${t.contato?.nome || ""} ${t.contato?.whatsapp || ""} ${t.numero}`.toLowerCase();
      if (!alvo.includes(q)) return false;
    }
    return true;
  };

  const counts = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    const c: Record<string, number> = { aberto: 0, pendente: 0, fechado: 0 };
    for (const t of p.tickets) {
      if (!passaNaoStatus(t, q)) continue;
      if (c[t.status] !== undefined) c[t.status]++;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.tickets, somenteNaoLidos, canalFiltros, filaFiltros, usuarioFiltros, etiquetaFiltros, de, ate, searchQ]);

  const ticketsVisiveis = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    const out = p.tickets.filter((t) => statusSel.includes(t.status) && passaNaoStatus(t, q));
    out.sort((a, b) => {
      const ta = a.ultima_mensagem_em ? new Date(a.ultima_mensagem_em).getTime() : 0;
      const tb = b.ultima_mensagem_em ? new Date(b.ultima_mensagem_em).getTime() : 0;
      return inverterOrdem ? ta - tb : tb - ta;
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.tickets, statusSel, somenteNaoLidos, canalFiltros, filaFiltros, usuarioFiltros, etiquetaFiltros, de, ate, inverterOrdem, searchQ]);

  const filtrosAtivos = (statusSel.length !== 2 || !statusSel.includes("aberto") || !statusSel.includes("pendente") ? 1 : 0)
    + (somenteNaoLidos ? 1 : 0) + (inverterOrdem ? 1 : 0) + (de || ate ? 1 : 0)
    + canalFiltros.length + filaFiltros.length + usuarioFiltros.length + etiquetaFiltros.length;

  const filasDisponiveis = useMemo(() => {
    const m = new Map<string, { id: string; nome: string; cor?: string | null }>();
    for (const f of p.filas || []) m.set(f.id, f);
    for (const t of p.tickets) if (t.fila && !m.has(t.fila.id)) m.set(t.fila.id, t.fila);
    return Array.from(m.values());
  }, [p.filas, p.tickets]);

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
          <button onClick={toggleSom} className="ghost-btn" style={btnHdr} title={somOn ? "Som de notificação ligado" : "Som mutado"}>
            <i className={`ti ${somOn ? "ti-bell" : "ti-bell-off"}`} style={{ color: somOn ? "#10b981" : "var(--mk-text-muted)" }} />
          </button>
          <button onClick={abrirFechamentos} className="ghost-btn" style={btnHdr} title="Log de fechamentos">
            <i className="ti ti-receipt-2" />
          </button>
          <button onClick={() => setFiltroAberto(true)} className="ghost-btn" style={btnHdr} title="Filtros">
            <i className="ti ti-filter" /> Filtros
            {filtrosAtivos > 0 && <span style={{ fontSize: 9.5, background: "#10b981", color: "#fff", borderRadius: 8, padding: "0 5px", marginLeft: 4 }}>{filtrosAtivos}</span>}
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

      {/* Abas de status — fixas, mas funcionam como toggle (clica = inclui/remove o status do filtro) */}
      <div style={sep}>
        <div style={{ display: "flex", padding: "6px 8px", gap: 4 }}>
          {TABS.map((t) => {
            const ativo = statusSel.includes(t.id);
            const cor = t.id === "fechado" ? "var(--mk-text-muted)" : "#10b981";
            return (
              <button
                key={t.id}
                onClick={() => toggleStatus(t.id)}
                title={ativo ? "Clique pra ocultar" : "Clique pra mostrar"}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  borderRadius: 6,
                  textAlign: "center",
                  background: ativo ? "var(--mk-surface)" : "transparent",
                  border: ativo ? `0.5px solid ${cor}` : "0.5px solid transparent",
                  color: ativo ? cor : "var(--mk-text-muted)",
                  opacity: ativo ? 1 : 0.55,
                  fontSize: 11,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  cursor: "pointer",
                }}
              >
                <i className={`ti ${ativo ? (t.id === "aberto" ? "ti-message" : t.id === "pendente" ? "ti-clock" : "ti-check") : "ti-eye-off"}`} />
                {t.label}
                <span style={{ fontSize: 9.5, background: ativo ? cor : "var(--mk-text-muted)", color: "#FFFDF8", borderRadius: 8, padding: "0 5px", marginLeft: 2 }}>{counts[t.id]}</span>
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
          ticketsVisiveis.slice(0, limite).map((t) => {
            const c = t.contato;
            const f = t.fila;
            const isOpen = t.id === p.ticketSel;
            return (
              <button
                key={t.id}
                onClick={() => p.onSelectTicket(t.id)}
                className="ticket-card"
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
                <AvatarContato
                  nome={c?.nome}
                  foto={c?.foto_url}
                  onAtender={t.status === "pendente" ? (e) => { e.stopPropagation(); atenderDireto(t.id); } : undefined}
                />
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
                      <span style={{ fontSize: 10, fontWeight: 600, color: corTempo(t.ultima_mensagem_em, now) }}>{tempoRel(t.ultima_mensagem_em, now)}</span>
                    )}
                    <span style={{ fontSize: 10, color: "var(--mk-text-muted)", fontFamily: "monospace" }}>#{t.numero}</span>
                    {(t.nao_lidas ?? 0) > 0 && (
                      <span
                        title={`${t.nao_lidas} mensagem${t.nao_lidas! > 1 ? "s" : ""} não lida${t.nao_lidas! > 1 ? "s" : ""}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 14,
                          height: 14,
                          padding: "0 4px",
                          borderRadius: 999,
                          background: "#10b981",
                          color: "#FFFFFF",
                          fontSize: 9,
                          fontWeight: 600,
                          lineHeight: 1,
                        }}
                      >
                        {t.nao_lidas! > 99 ? "99+" : t.nao_lidas}
                      </span>
                    )}
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
        {/* Sentinela do infinite scroll — quando entra no viewport carrega +20 */}
        {ticketsVisiveis.length > limite && (
          <div ref={sentinelaRef} style={{ padding: "12px 14px", fontSize: 11, color: "var(--mk-text-muted)", textAlign: "center" }}>
            Mostrando {limite} de {ticketsVisiveis.length} — role pra carregar mais
          </div>
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
              {filtrosAtivos > 0 && <button onClick={limparFiltros} style={{ fontSize: 11.5, color: "var(--mk-accent)", background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", marginRight: 10 }}>Limpar</button>}
              <button onClick={() => setFiltroAberto(false)} style={modalCloseBtn}><i className="ti ti-x" /></button>
            </div>
            <div className="chat-scroll" style={{ padding: 16, overflowY: "auto", flex: 1, minHeight: 0 }}>
              {/* Toggles topo */}
              <ChkRow on={!somenteNaoLidos && statusSel.length === 3} icon="ti-eye" label="Mostrar todos" onClick={() => { setStatusSel(["aberto", "pendente", "fechado"]); setSomenteNaoLidos(false); }} />
              <ChkRow on={statusSel.includes("fechado")} icon="ti-mail" label="Incluir tickets fechados" onClick={() => toggleStatus("fechado")} />
              <ChkRow on={somenteNaoLidos} icon="ti-mail-opened" label="Somente não lidos" onClick={() => setSomenteNaoLidos((v) => !v)} />
              <ChkRow on={inverterOrdem} icon="ti-arrows-sort" label="Inverter ordem geral" onClick={() => setInverterOrdem((v) => !v)} />

              <Secao titulo="STATUS">
                {TABS.map((t) => (
                  <ChkRow key={t.id} on={statusSel.includes(t.id)} label={`${t.label}`} extra={`(${counts[t.id]})`} onClick={() => toggleStatus(t.id)} />
                ))}
              </Secao>

              <Secao titulo="PERÍODO">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--mk-text-muted)", width: 28 }}>De</span>
                  <input type="date" value={de} onChange={(e) => setDe(e.target.value)} style={dateInp} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--mk-text-muted)", width: 28 }}>Até</span>
                  <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} style={dateInp} />
                </div>
              </Secao>

              <Secao titulo="CONEXÕES">
                {p.canais.map((c) => (
                  <ChkRow key={c.id} on={canalFiltros.includes(c.id)} dot={c.status === "connected" ? "#10b981" : "#C97064"} label={c.nome} onClick={() => toggleCanal(c.id)} />
                ))}
              </Secao>

              {filasDisponiveis.length > 0 && (
                <Secao titulo="FILAS">
                  {filasDisponiveis.map((f) => (
                    <ChkRow key={f.id} on={filaFiltros.includes(f.id)} dot={f.cor || "#5B8BA6"} label={f.nome} onClick={() => toggleFila(f.id)} />
                  ))}
                </Secao>
              )}

              {(p.usuarios || []).length > 0 && (
                <Secao titulo="USUÁRIO">
                  {(p.usuarios || []).map((u) => (
                    <ChkRow key={u.id} on={usuarioFiltros.includes(u.id)} icon="ti-user" label={u.nome} onClick={() => toggleUsuario(u.id)} />
                  ))}
                </Secao>
              )}

              {etiquetasDisponiveis.length > 0 && (
                <Secao titulo="ETIQUETA">
                  {etiquetasDisponiveis.map((e) => (
                    <ChkRow key={e.id} on={etiquetaFiltros.includes(e.id)} tagColor={e.cor} label={e.nome} onClick={() => toggleEtiquetaFiltro(e.id)} />
                  ))}
                </Secao>
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

/** Cor do último contato por recência: agora=verde claro, minutos=verde, horas=amarelo, dias+=vermelho. */
function corTempo(iso: string, now: number): string {
  const min = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (min < 1) return "#4ade80";   // agora — verde claro
  if (min < 60) return "#10b981";  // minutos — verde escuro
  if (min < 1440) return "#f59e0b"; // horas — amarelo
  return "#e24b4a";                 // dias+ — vermelho
}

/** Avatar do contato: foto do WhatsApp com fallback pras iniciais (foto pode expirar). */
function AvatarContato({ nome, foto, onAtender }: { nome?: string | null; foto?: string | null; onAtender?: (e: React.MouseEvent) => void }) {
  const [erro, setErro] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const ini = nome?.slice(0, 2).toUpperCase() || "?";
  const hasAtender = !!onAtender;
  const podeAmpliar = !!(foto && !erro);

  return (
    <div
      className={hasAtender ? "avatar-atender" : undefined}
      style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}
    >
      {foto && !erro ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={foto}
          alt=""
          onError={() => setErro(true)}
          onClick={podeAmpliar ? (e) => { e.stopPropagation(); setLightbox(true); } : undefined}
          style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", background: "var(--mk-surface-2)", cursor: podeAmpliar ? "zoom-in" : "default" }}
        />
      ) : (
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(155,125,191,0.18)", color: "#9B7DBF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 600 }}>
          {ini}
        </div>
      )}
      {hasAtender && (
        <button
          type="button"
          onClick={onAtender}
          title="Atender — move o ticket de Pendentes pra Abertos e abre direto"
          className="avatar-atender-btn"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "rgba(16,185,129,0.92)",
            color: "#FFFFFF",
            border: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            opacity: 0,
            transition: "opacity 0.18s ease",
            fontSize: 18,
          }}
        >
          <i className="ti ti-arrow-left" />
        </button>
      )}
      <LightboxFoto src={foto} alt={nome || ""} open={lightbox} onClose={() => setLightbox(false)} />
    </div>
  );
}

const modalCloseBtn: React.CSSProperties = { background: "var(--mk-surface)", border: "0.5px solid var(--mk-border)", borderRadius: "50%", width: 28, height: 28, color: "var(--mk-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

const dateInp: React.CSSProperties = { flex: 1, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5, colorScheme: "dark", fontFamily: "inherit" };

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: "0.5px solid var(--mk-border)", marginTop: 12, paddingTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text-muted)", marginBottom: 6, letterSpacing: 0.4 }}>{titulo}</div>
      {children}
    </div>
  );
}

function ChkRow({ on, onClick, label, icon, dot, tagColor, extra }: { on: boolean; onClick: () => void; label: string; icon?: string; dot?: string; tagColor?: string; extra?: string }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "7px 0", fontSize: 12.5, color: on ? "var(--mk-text)" : "var(--mk-text-secondary)", background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }}>
      <i className={`ti ${on ? "ti-square-check-filled" : "ti-square"}`} style={{ fontSize: 17, color: on ? "var(--mk-accent)" : "var(--mk-text-muted)", flexShrink: 0 }} />
      {dot && <span style={{ width: 9, height: 9, borderRadius: "50%", background: dot, flexShrink: 0 }} />}
      {tagColor && <i className="ti ti-tag" style={{ color: tagColor, flexShrink: 0 }} />}
      {icon && <i className={`ti ${icon}`} style={{ color: "var(--mk-text-muted)", flexShrink: 0 }} />}
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {extra && <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>{extra}</span>}
    </button>
  );
}
