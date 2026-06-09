"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Ticket {
  id: string;
  numero: number;
  status: string;
  ultima_mensagem_em: string | null;
  ultima_mensagem_preview: string | null;
  sentimento: string | null;
  contato: { id: string; nome: string; whatsapp: string | null; foto_url: string | null } | null;
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
  tab: "aberto" | "pendente" | "fechado";
  ticketSel: string | undefined;
  q: string | undefined;
  canal: string | undefined;
  tickets: Ticket[];
  canais: Canal[];
  counts: Record<string, number>;
}

const TABS: Array<{ id: "aberto" | "pendente" | "fechado"; label: string }> = [
  { id: "aberto", label: "Abertos" },
  { id: "pendente", label: "Pendentes" },
  { id: "fechado", label: "Fechados" },
];

export function ListaAtendimentos(p: Props) {
  const router = useRouter();
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [searchModal, setSearchModal] = useState(false);
  const [tipoConexao, setTipoConexao] = useState<"connected" | "connecting" | "disconnected">("connected");
  const [showCanais, setShowCanais] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQ, setSearchQ] = useState(p.q || "");
  const [searchMsgText, setSearchMsgText] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; numero: number; contato_nome: string; conteudo: string; created_at: string; ticketId: string }>>([]);
  const [aba, setAba] = useState<"privados" | "grupos">("privados");
  const canaisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (canaisRef.current && !canaisRef.current.contains(e.target as Node)) setShowCanais(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function getQuery() {
    const u = new URLSearchParams();
    u.set("tab", p.tab);
    if (searchQ) u.set("q", searchQ);
    if (p.canal && p.canal !== "todos") u.set("canal", p.canal);
    return u.toString();
  }

  function refresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }

  function ciclarTipoConexao() {
    setTipoConexao((t) => (t === "connected" ? "connecting" : t === "connecting" ? "disconnected" : "connected"));
  }

  const canaisConectados = p.canais.filter((c) => c.status === "connected");
  const canaisConectando = p.canais.filter((c) => c.status === "pending_qr" || c.status === "connecting");
  const canaisDesconectados = p.canais.filter((c) => c.status === "disconnected" || c.status === "error");

  const conexaoConfig = {
    connected: { icon: "ti-wifi", color: "#6B8E4E", bg: "rgba(107,142,78,0.18)", border: "#6B8E4E", lista: canaisConectados, label: "Conectado" },
    connecting: { icon: "ti-qrcode", color: "#C9A876", bg: "rgba(201,168,118,0.18)", border: "#C9A876", lista: canaisConectando, label: "Conectando" },
    disconnected: { icon: "ti-wifi-off", color: "#C97064", bg: "rgba(201,112,100,0.18)", border: "#C97064", lista: canaisDesconectados, label: "Desconectado" },
  }[tipoConexao];

  async function buscarMensagens() {
    if (!searchMsgText.trim()) return;
    try {
      const r = await fetch(`/api/atendimentos/buscar-mensagens?q=${encodeURIComponent(searchMsgText)}`);
      const j = await r.json();
      setSearchResults(j.resultados || []);
    } catch {
      setSearchResults([]);
    }
  }

  return (
    <aside style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "var(--mk-bg)" }}>
      {/* Header título + filtros */}
      <div style={sep}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", gap: 6 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--mk-text)", flex: 1 }}>Atendimentos</h2>
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
              onKeyDown={(e) => { if (e.key === "Enter") router.push(`/atendimentos?${getQuery()}`); }}
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
      {(p.canal && p.canal !== "todos") && (
        <div style={sep}>
          <div style={{ display: "flex", gap: 4, padding: "8px 12px", flexWrap: "wrap" }}>
            <Link href={`/atendimentos?tab=${p.tab}`} style={chipBtn}>Ver todos <i className="ti ti-x" /></Link>
            <span style={chipActive}>
              {p.canais.find((c) => c.id === p.canal)?.nome || "Canal"}
              <Link href={`/atendimentos?tab=${p.tab}${searchQ ? `&q=${searchQ}` : ""}`} style={{ marginLeft: 4 }}>×</Link>
            </span>
          </div>
        </div>
      )}

      {/* Tabs status */}
      <div style={sep}>
        <div style={{ display: "flex", padding: "6px 8px", gap: 4 }}>
          {TABS.map((t) => {
            const ativo = t.id === p.tab;
            const cor = t.id === "aberto" ? "#6B8E4E" : t.id === "pendente" ? "#C9A876" : "var(--mk-text-muted)";
            return (
              <Link
                key={t.id}
                href={`/atendimentos?tab=${t.id}${p.canal && p.canal !== "todos" ? `&canal=${p.canal}` : ""}${searchQ ? `&q=${searchQ}` : ""}`}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  borderRadius: 6,
                  textAlign: "center",
                  textDecoration: "none",
                  background: ativo ? "var(--mk-surface)" : "transparent",
                  border: ativo ? `0.5px solid ${cor}` : "0.5px solid transparent",
                  color: ativo ? cor : "var(--mk-text-muted)",
                  fontSize: 11,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <i className={`ti ${t.id === "aberto" ? "ti-message" : t.id === "pendente" ? "ti-clock" : "ti-check"}`} />
                {t.label}
                <span style={{ fontSize: 9.5, background: cor, color: "#FFFDF8", borderRadius: 8, padding: "0 5px", marginLeft: 2 }}>{p.counts[t.id]}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Lista tickets */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {!p.tickets || p.tickets.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12 }}>Sem tickets.</div>
        ) : (
          p.tickets.map((t) => {
            const c = t.contato;
            const f = t.fila;
            const isOpen = t.id === p.ticketSel;
            return (
              <Link
                key={t.id}
                href={`/atendimentos?tab=${p.tab}${searchQ ? `&q=${encodeURIComponent(searchQ)}` : ""}${p.canal && p.canal !== "todos" ? `&canal=${p.canal}` : ""}&t=${t.id}`}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "12px 14px",
                  borderBottom: "0.5px solid var(--mk-border)",
                  textDecoration: "none",
                  color: "var(--mk-text)",
                  background: isOpen ? "var(--mk-surface)" : "transparent",
                  borderLeft: isOpen ? "2px solid var(--mk-accent)" : "2px solid transparent",
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(155,125,191,0.18)", color: "#9B7DBF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 600, flexShrink: 0 }}>
                  {c?.nome.slice(0, 2).toUpperCase() || "?"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c?.nome || c?.whatsapp || "—"}</span>
                    <span style={{ fontSize: 10, color: "var(--mk-text-muted)", fontFamily: "monospace" }}>#{t.numero}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.ultima_mensagem_preview || "—"}
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                    {f && <span style={{ fontSize: 9.5, padding: "1px 5px", borderRadius: 3, background: `${f.cor}22`, color: f.cor, border: `0.5px solid ${f.cor}` }}>{f.nome}</span>}
                    {t.canal && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(37,211,102,0.12)", color: "#25D366" }}>{t.canal.nome}</span>}
                    {t.sentimento === "muito_bom" && <span style={{ fontSize: 9.5, color: "#6B8E4E" }}>● ótimo</span>}
                    {t.sentimento === "ruim" && <span style={{ fontSize: 9.5, color: "#C97064" }}>● ruim</span>}
                  </div>
                </div>
              </Link>
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
              <div style={{ marginTop: 14, maxHeight: 400, overflowY: "auto" }}>
                {searchResults.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--mk-text-muted)", padding: 30, fontSize: 12 }}>
                    {searchMsgText ? "Sem resultados" : "Digite um termo pra buscar"}
                  </div>
                ) : (
                  searchResults.map((r) => (
                    <Link
                      key={r.id}
                      href={`/atendimentos?tab=aberto&t=${r.ticketId}`}
                      onClick={() => setSearchModal(false)}
                      style={{ display: "block", padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface)", marginBottom: 6, color: "var(--mk-text)", textDecoration: "none" }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-accent)" }}>#{r.numero} · {r.contato_nome}</div>
                      <div style={{ fontSize: 11.5, marginTop: 4, color: "var(--mk-text-secondary)" }}>{r.conteudo.slice(0, 200)}</div>
                      <div style={{ fontSize: 10, color: "var(--mk-text-muted)", marginTop: 4 }}>{new Date(r.created_at).toLocaleString("pt-BR")}</div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Filtros (simplificado) */}
      {filtroAberto && (
        <div style={modalOverlay} onClick={() => setFiltroAberto(false)}>
          <div style={{ ...modalBox, width: "min(380px, 92vw)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "0.5px solid var(--mk-border)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, flex: 1 }}><i className="ti ti-filter" style={{ marginRight: 6 }} /> Filtros</h3>
              <button onClick={() => setFiltroAberto(false)} style={modalCloseBtn}><i className="ti ti-x" /></button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text-muted)", marginBottom: 6, letterSpacing: 0.4 }}>STATUS</div>
              {TABS.map((t) => (
                <Link
                  key={t.id}
                  href={`/atendimentos?tab=${t.id}${p.canal && p.canal !== "todos" ? `&canal=${p.canal}` : ""}`}
                  onClick={() => setFiltroAberto(false)}
                  style={{ display: "block", padding: "8px 0", fontSize: 12.5, color: t.id === p.tab ? "var(--mk-accent)" : "var(--mk-text-secondary)", textDecoration: "none" }}
                >
                  {t.id === p.tab ? "● " : "○ "}{t.label} <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>({p.counts[t.id]})</span>
                </Link>
              ))}

              <div style={{ borderTop: "0.5px solid var(--mk-border)", marginTop: 12, paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text-muted)", marginBottom: 6, letterSpacing: 0.4 }}>CANAIS</div>
                <Link
                  href={`/atendimentos?tab=${p.tab}`}
                  onClick={() => setFiltroAberto(false)}
                  style={{ display: "block", padding: "6px 0", fontSize: 12, color: !p.canal || p.canal === "todos" ? "var(--mk-accent)" : "var(--mk-text-secondary)", textDecoration: "none" }}
                >
                  {!p.canal || p.canal === "todos" ? "● " : "○ "}Todos canais
                </Link>
                {p.canais.map((c) => (
                  <Link
                    key={c.id}
                    href={`/atendimentos?tab=${p.tab}&canal=${c.id}`}
                    onClick={() => setFiltroAberto(false)}
                    style={{ display: "block", padding: "6px 0", fontSize: 12, color: p.canal === c.id ? "var(--mk-accent)" : "var(--mk-text-secondary)", textDecoration: "none" }}
                  >
                    {p.canal === c.id ? "● " : "○ "}{c.status === "connected" ? "🟢" : "🔴"} {c.nome}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
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
    background: ativo ? "var(--mk-text)" : "transparent",
    color: ativo ? "var(--mk-bg)" : "var(--mk-text-muted)",
    transition: "all 150ms",
  };
}

const chipBtn: React.CSSProperties = { fontSize: 10.5, padding: "3px 8px", borderRadius: 12, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text-secondary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 };
const chipActive: React.CSSProperties = { ...chipBtn, background: "rgba(155,125,191,0.18)", color: "#9B7DBF", border: "0.5px solid #9B7DBF" };

const modalOverlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, backdropFilter: "blur(2px)" };
const modalBox: React.CSSProperties = { background: "var(--mk-bg)", border: "0.5px solid var(--mk-border)", borderRadius: 14, width: "min(560px, 92vw)", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" };
const modalCloseBtn: React.CSSProperties = { background: "var(--mk-surface)", border: "0.5px solid var(--mk-border)", borderRadius: "50%", width: 28, height: 28, color: "var(--mk-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
