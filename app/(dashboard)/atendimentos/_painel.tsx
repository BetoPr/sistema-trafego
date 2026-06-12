"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface Contato {
  id: string;
  nome: string;
  whatsapp: string | null;
  ia_habilitada: boolean;
  email?: string | null;
  empresa?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cpf?: string | null;
}

interface Ticket {
  id: string;
  numero: number;
  sentimento: string | null;
  sentimento_confianca: number | null;
  sentimento_motivo: string | null;
  resumo: string | null;
  resumo_atualizado_em: string | null;
  valor_fechado?: number | null;
  metadata?: { servico?: string; quantidade?: number } | null;
}

interface Tag {
  id: string;
  nome: string;
  cor: string;
  categoria?: "etiqueta" | "flag";
}

interface ServicoOpt {
  id: string;
  nome: string;
}

interface Props {
  ticket: Ticket;
  contato: Contato;
  etiquetas: Tag[];
  todasEtiquetas?: Tag[];
  servicos?: ServicoOpt[];
  servicosHabilitados?: boolean;
  onFechar?: () => void;
  onRefresh?: () => void;
}

export function PainelDireito({ ticket, contato, etiquetas, todasEtiquetas = [], servicos = [], servicosHabilitados = false, onFechar, onRefresh }: Props) {
  const router = useRouter();
  // SPA mode: onRefresh refaz fetch do bundle; fallback router.refresh pro modo server
  const refresh = () => (onRefresh ? onRefresh() : router.refresh());
  const [tab, setTab] = useState<"perfil" | "atend" | "util">("perfil");
  const [loadingResumo, setLoadingResumo] = useState(false);
  const [loadingSent, setLoadingSent] = useState(false);
  const [streamingResumo, setStreamingResumo] = useState<string>("");
  const [streamingActive, setStreamingActive] = useState(false);
  const [showEtiquetaPicker, setShowEtiquetaPicker] = useState<null | "etiqueta" | "flag">(null);
  const [novaEtiquetaNome, setNovaEtiquetaNome] = useState("");
  const [modalLog, setModalLog] = useState<null | "ticket" | "notas">(null);
  const [logsTicket, setLogsTicket] = useState<Array<{ id: string; acao: string; entidade: string | null; created_at: string; usuario?: { nome?: string } | { nome?: string }[] | null; payload?: Record<string, unknown> | null }>>([]);
  const [notas, setNotas] = useState<Array<{ id: string; conteudo: string; created_at: string; usuario?: { nome?: string } | { nome?: string }[] | null }>>([]);
  const [novaNota, setNovaNota] = useState("");
  const [fechValor, setFechValor] = useState<string>(ticket.valor_fechado != null ? String(ticket.valor_fechado) : "");
  const [fechServico, setFechServico] = useState<string>(ticket.metadata?.servico || "");
  const [fechQtd, setFechQtd] = useState<string>(ticket.metadata?.quantidade != null ? String(ticket.metadata.quantidade) : "");
  const [savingFech, setSavingFech] = useState(false);

  async function salvarFechamento() {
    setSavingFech(true);
    try {
      const r = await fetch(`/api/atendimentos/${ticket.id}/fechamento`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          valor: fechValor ? Number(fechValor.replace(",", ".")) : null,
          servico: fechServico.trim() || null,
          quantidade: fechQtd ? Number(fechQtd) : null,
        }),
      });
      const j = await r.json();
      if (!r.ok) alert(`Erro: ${j.error || j.msg}`);
      else { alert("Fechamento salvo"); refresh(); }
    } catch (e) { alert(`Erro: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setSavingFech(false); }
  }

  async function addEtiqueta(etiquetaId?: string, nome?: string, categoria?: "etiqueta" | "flag") {
    try {
      const r = await fetch(`/api/contatos/${contato.id}/etiquetas`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(etiquetaId ? { etiquetaId } : { nome, cor: corAleatoria(), categoria: categoria || "etiqueta" }),
      });
      const j = await r.json();
      if (!r.ok) alert(`Erro: ${j.error}`);
      else { refresh(); setShowEtiquetaPicker(null); setNovaEtiquetaNome(""); }
    } catch (e) { alert(`Erro: ${e instanceof Error ? e.message : String(e)}`); }
  }

  async function removeEtiqueta(etiquetaId: string) {
    if (!confirm("Remover flag deste contato?")) return;
    try {
      const r = await fetch(`/api/contatos/${contato.id}/etiquetas?etiquetaId=${etiquetaId}`, { method: "DELETE" });
      if (r.ok) refresh();
    } catch {}
  }

  async function editarEtiqueta(etiquetaId: string, nomeAtual: string) {
    const novoNome = prompt("Renomear flag:", nomeAtual);
    if (!novoNome || !novoNome.trim() || novoNome === nomeAtual) return;
    try {
      const r = await fetch(`/api/etiquetas/${etiquetaId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome: novoNome.trim() }),
      });
      if (r.ok) refresh();
      else { const j = await r.json(); alert(`Erro: ${j.error}`); }
    } catch (e) { alert(`Erro: ${e instanceof Error ? e.message : String(e)}`); }
  }

  async function excluirEtiqueta(etiquetaId: string, nome: string) {
    if (!confirm(`Excluir flag "${nome}" da agência? Vai remover de todos contatos.`)) return;
    try {
      const r = await fetch(`/api/etiquetas/${etiquetaId}`, { method: "DELETE" });
      if (r.ok) refresh();
      else { const j = await r.json(); alert(`Erro: ${j.error}`); }
    } catch (e) { alert(`Erro: ${e instanceof Error ? e.message : String(e)}`); }
  }

  function corAleatoria() {
    const cores = ["#10b981", "#9B7DBF", "#5B8BA6", "#10b981", "#C97064", "#10b981"];
    return cores[Math.floor(Math.random() * cores.length)];
  }

  async function marcarLido(lido: boolean) {
    try {
      const r = await fetch(`/api/atendimentos/${ticket.id}/marcar-lido`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lido }),
      });
      if (r.ok) refresh();
    } catch {}
  }

  async function abrirLogTicket() {
    setModalLog("ticket");
    try {
      const r = await fetch(`/api/atendimentos/${ticket.id}/logs`);
      const j = await r.json();
      setLogsTicket(j.logs || []);
    } catch {}
  }

  async function abrirLogNotas() {
    setModalLog("notas");
    try {
      const r = await fetch(`/api/atendimentos/${ticket.id}/notas`);
      const j = await r.json();
      setNotas(j.notas || []);
    } catch {}
  }

  // Download automático do PDF real (rota com Content-Disposition: attachment)
  function baixarPDF(ticketId: string, numero: number) {
    const a = document.createElement("a");
    a.href = `/api/atendimentos/${ticketId}/export-pdf-file`;
    a.download = `conversa-${numero}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Abre a versão HTML que dispara o diálogo de impressão do navegador
  function imprimirConversa(ticketId: string) {
    const w = window.open(`/api/atendimentos/${ticketId}/export-pdf`, "_blank");
    if (!w) alert("Habilita popups pra imprimir");
  }

  async function sanitizar(contatoId: string) {
    if (!confirm("Remover todos dados sensíveis deste contato? Ação irreversível.")) return;
    try {
      const r = await fetch(`/api/contatos/${contatoId}/sanitizar`, { method: "POST" });
      if (r.ok) {
        alert("Contato sanitizado");
        refresh();
      } else {
        const j = await r.json();
        alert(`Erro: ${j.error}`);
      }
    } catch (e) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function salvarNota() {
    if (!novaNota.trim()) return;
    try {
      const r = await fetch(`/api/atendimentos/${ticket.id}/notas`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conteudo: novaNota }),
      });
      if (r.ok) {
        setNovaNota("");
        if (modalLog === "notas") abrirLogNotas();
        alert("Nota salva");
      }
    } catch {}
  }

  async function gerarResumo() {
    setLoadingResumo(true);
    setStreamingResumo("");
    setStreamingActive(true);
    try {
      const res = await fetch(`/api/atendimentos/${ticket.id}/resumo-stream`);
      if (!res.ok || !res.body) {
        alert(`Erro: ${res.statusText}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let aborted = false;
      while (!aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const chunk = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!chunk.startsWith("data:")) continue;
          const data = chunk.slice(5).trim();
          try {
            const json = JSON.parse(data) as { delta?: string; done?: boolean; error?: string };
            if (json.error) {
              alert(`Erro: ${json.error}`);
              aborted = true;
              break;
            }
            if (json.delta) {
              setStreamingResumo((prev) => prev + json.delta);
            }
            if (json.done) {
              refresh();
              aborted = true;
              break;
            }
          } catch {}
        }
      }
    } catch (e) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoadingResumo(false);
      setStreamingActive(false);
    }
  }

  async function gerarSentimento() {
    setLoadingSent(true);
    try {
      const r = await fetch(`/api/atendimentos/${ticket.id}/sentimento`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) alert(`Erro: ${j.error || j.msg}`);
      else refresh();
    } finally {
      setLoadingSent(false);
    }
  }

  const sentimentoCor = ticket.sentimento === "muito_bom" ? "#10b981" : ticket.sentimento === "bom" ? "#5B8BA6" : ticket.sentimento === "ruim" ? "#C97064" : "var(--mk-text-muted)";
  const sentimentoLabel = ticket.sentimento === "muito_bom" ? "Muito bom" : ticket.sentimento === "bom" ? "Bom" : ticket.sentimento === "ruim" ? "Ruim" : "Não analisado";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--mk-border)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center" }}>
        <span style={{ flex: 1 }}>Detalhes do contato</span>
        {onFechar && (
          <button
            onClick={onFechar}
            title="Fechar painel"
            style={{ background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", fontSize: 16, padding: 2, lineHeight: 1 }}
          >
            <i className="ti ti-x" />
          </button>
        )}
      </div>
      <div style={{ display: "flex", borderBottom: "0.5px solid var(--mk-border)" }}>
        {[
          { id: "perfil", label: "Perfil" },
          { id: "atend", label: "Atend." },
          { id: "util", label: "Util." },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            style={{
              flex: 1,
              padding: "8px 6px",
              background: tab === t.id ? "var(--mk-surface)" : "transparent",
              border: 0,
              borderBottom: tab === t.id ? "2px solid var(--mk-accent)" : "2px solid transparent",
              color: tab === t.id ? "var(--mk-text)" : "var(--mk-text-muted)",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="chat-scroll" style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {tab === "perfil" && (
          <>
            {/* CARD info do cliente com separadores */}
            <Card>
              <div style={{ textAlign: "center", padding: "14px 12px 8px" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(155,125,191,0.25)", color: "#9B7DBF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 22 }}>
                  {contato.nome.slice(0, 2).toUpperCase()}
                </div>
              </div>
              <InfoLinha icon="ti-user" label="Nome" value={contato.nome} copy={contato.nome} />
              <InfoLinha icon="ti-phone" label="Telefone" value={formatarTel(contato.whatsapp)} mono copy={contato.whatsapp} />
              <InfoLinha icon="ti-map-pin" label="Estado (DDD)" value={estadoPorDDD(contato.whatsapp) || contato.estado || "—"} noBorder />
              <div style={{ display: "flex", gap: 6, padding: "10px 12px 12px", borderTop: "0.5px solid var(--mk-border)" }}>
                <a href={`/contatos?editar=${contato.id}`} className="ghost-btn" style={{ flex: 1, fontSize: 11, textAlign: "center" }}>
                  <i className="ti ti-edit" /> Editar
                </a>
              </div>
            </Card>

            {/* CARD Etiquetas */}
            <Card titulo="Etiquetas">
              {etiquetas.filter((e) => (e.categoria || "etiqueta") === "etiqueta").length > 0 ? (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "10px 12px" }}>
                  {etiquetas.filter((e) => (e.categoria || "etiqueta") === "etiqueta").map((e) => (
                    <span key={e.id} onClick={() => removeEtiqueta(e.id)} title="Clique pra remover deste contato" style={{ fontSize: 10, padding: "3px 8px", borderRadius: 12, background: `${e.cor}33`, color: e.cor, border: `0.5px solid ${e.cor}`, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {e.nome} <i className="ti ti-x" style={{ fontSize: 9 }} />
                    </span>
                  ))}
                </div>
              ) : <div style={{ padding: "10px 12px", fontSize: 11, color: "var(--mk-text-muted)" }}>Sem etiquetas</div>}
              <div style={{ borderTop: "0.5px solid var(--mk-border)", padding: "8px 12px" }}>
                <button onClick={() => setShowEtiquetaPicker("etiqueta")} className="ghost-btn" style={{ fontSize: 11, width: "100%" }}>
                  <i className="ti ti-plus" /> Adicionar etiqueta
                </button>
              </div>
            </Card>

            {/* CARD fechamento */}
            {ticket.valor_fechado != null ? (
              <Card titulo="Fechamento">
                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#10b981", fontSize: 12, fontWeight: 600 }}>
                    <i className="ti ti-circle-check" style={{ fontSize: 16 }} />
                    Fechamento registrado
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--mk-text)" }}>
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(ticket.valor_fechado))}
                  </div>
                  {ticket.metadata?.servico && (
                    <div style={{ fontSize: 11.5, color: "var(--mk-text-secondary)" }}>
                      <i className="ti ti-package" style={{ marginRight: 4 }} />{ticket.metadata.servico}
                      {ticket.metadata?.quantidade != null && <span style={{ color: "var(--mk-text-muted)" }}> × {ticket.metadata.quantidade}</span>}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "var(--mk-text-muted)", marginTop: 2 }}>
                    Este ticket já tem fechamento — não é possível registrar outro.
                  </div>
                </div>
              </Card>
            ) : (
            <Card titulo="Fechamento">
              <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 10.5, color: "var(--mk-text-muted)", letterSpacing: 0.4 }}>VALOR (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fechValor}
                  onChange={(e) => setFechValor(e.target.value.replace(/[^0-9.,]/g, ""))}
                  placeholder="0,00"
                  style={{ padding: "7px 10px", borderRadius: 6, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12 }}
                />

                <label style={{ fontSize: 10.5, color: "var(--mk-text-muted)", letterSpacing: 0.4, marginTop: 4 }}>SERVIÇO</label>
                {servicosHabilitados ? (
                  <select
                    value={fechServico}
                    onChange={(e) => setFechServico(e.target.value)}
                    style={{ padding: "7px 10px", borderRadius: 6, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12 }}
                  >
                    <option value="">— Selecione —</option>
                    {servicos.map((s) => (
                      <option key={s.id} value={s.nome}>{s.nome}</option>
                    ))}
                    {fechServico && !servicos.find((s) => s.nome === fechServico) && (
                      <option value={fechServico}>{fechServico} (antigo)</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={fechServico}
                    onChange={(e) => setFechServico(e.target.value)}
                    placeholder="Ex: Gestão de tráfego"
                    style={{ padding: "7px 10px", borderRadius: 6, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12 }}
                  />
                )}
                {servicosHabilitados && servicos.length === 0 && (
                  <a href="/configuracoes/servicos" style={{ fontSize: 10.5, color: "#10b981", textDecoration: "none" }}>
                    <i className="ti ti-plus" /> Cadastre serviços em Configurações → Serviços
                  </a>
                )}

                <label style={{ fontSize: 10.5, color: "var(--mk-text-muted)", letterSpacing: 0.4, marginTop: 4 }}>QUANTIDADE</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fechQtd}
                  onChange={(e) => setFechQtd(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="1"
                  style={{ padding: "7px 10px", borderRadius: 6, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12 }}
                />
              </div>
              <div style={{ borderTop: "0.5px solid var(--mk-border)", padding: "8px 12px" }}>
                <button onClick={salvarFechamento} disabled={savingFech} className="cta-btn" style={{ fontSize: 11, width: "100%" }}>
                  <i className="ti ti-check" /> {savingFech ? "Salvando..." : "Salvar fechamento"}
                </button>
              </div>
            </Card>
            )}

            <Card titulo="Resumo IA">
              <div style={{ padding: "10px 12px" }}>
                {streamingActive && !streamingResumo ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "#9B7DBF" }}>
                    <i className="ti ti-sparkles" style={{ fontSize: 16 }} />
                    <span style={{ fontStyle: "italic" }}>IA está escrevendo</span>
                    <span className="ia-dots"><span>.</span><span>.</span><span>.</span></span>
                    <style>{`
                      .ia-dots span { animation: iadot 1.4s infinite; display: inline-block; }
                      .ia-dots span:nth-child(2) { animation-delay: 0.2s; }
                      .ia-dots span:nth-child(3) { animation-delay: 0.4s; }
                      @keyframes iadot { 0%, 60%, 100% { opacity: 0.3 } 30% { opacity: 1 } }
                    `}</style>
                  </div>
                ) : streamingResumo ? (
                  <div style={{ fontSize: 11.5, color: "var(--mk-text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {streamingResumo}
                    {streamingActive && <span style={{ display: "inline-block", width: 6, height: 12, background: "#9B7DBF", marginLeft: 2, animation: "blink 1s infinite" }} />}
                    <style>{`@keyframes blink { 50% { opacity: 0 } }`}</style>
                  </div>
                ) : ticket.resumo ? (
                  <div style={{ fontSize: 11.5, color: "var(--mk-text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {ticket.resumo}
                  </div>
                ) : <div style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>Não gerado ainda.</div>}
              </div>
              {ticket.resumo_atualizado_em && !streamingActive && (
                <div style={{ borderTop: "0.5px solid var(--mk-border)", padding: "6px 12px", fontSize: 9.5, color: "var(--mk-text-muted)" }}>
                  Atualizado: {new Date(ticket.resumo_atualizado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </div>
              )}
              <div style={{ borderTop: "0.5px solid var(--mk-border)", padding: "8px 12px" }}>
                <button onClick={gerarResumo} disabled={loadingResumo} className="cta-btn" style={{ fontSize: 11, width: "100%" }}>
                  <i className="ti ti-sparkles" /> {loadingResumo ? "Gerando..." : ticket.resumo ? "Gerar novo resumo" : "Gerar resumo"}
                </button>
              </div>
            </Card>

            {/* CARD Notas */}
            <Card titulo="Notas">
              <div style={{ padding: "10px 12px" }}>
                <textarea
                  value={novaNota}
                  onChange={(e) => setNovaNota(e.target.value)}
                  placeholder="Adicionar nota privada (não vai pro cliente)…"
                  rows={3}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 11.5, resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
              <div style={{ borderTop: "0.5px solid var(--mk-border)", padding: "8px 12px", display: "flex", gap: 6 }}>
                <button onClick={salvarNota} disabled={!novaNota.trim()} className="cta-btn" style={{ flex: 1, fontSize: 11 }}>
                  <i className="ti ti-plus" /> Salvar
                </button>
                <button onClick={abrirLogNotas} className="ghost-btn" style={{ flex: 1, fontSize: 11 }}>
                  <i className="ti ti-list" /> Log de notas
                </button>
              </div>
            </Card>
          </>
        )}

        {tab === "atend" && (
          <>
            {/* CARD sentimento — 1x por atendimento */}
            <Card>
              <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", borderBottom: "0.5px solid var(--mk-border)" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600 }}>
                  <i className="ti ti-sparkles" style={{ color: "#9B7DBF" }} />
                  Análise de sentimento
                </div>
                {ticket.sentimento && (
                  <span title="Já analisado" style={{ color: "#10b981", fontSize: 13 }}><i className="ti ti-lock-check" /></span>
                )}
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              </div>
              <div style={{ padding: "12px 14px" }}>
                {loadingSent ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--mk-text-muted)" }}>
                    <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> Analisando...
                  </div>
                ) : ticket.sentimento ? (
                  <>
                    <div style={{ fontSize: 12.5, color: sentimentoCor, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <i className={`ti ${ticket.sentimento === "muito_bom" ? "ti-mood-happy" : ticket.sentimento === "bom" ? "ti-mood-smile" : "ti-mood-sad"}`} />
                      {sentimentoLabel}
                      {ticket.sentimento_confianca !== null && <span style={{ fontWeight: 400 }}>- {ticket.sentimento_confianca}%</span>}
                    </div>
                    {ticket.sentimento_motivo && (
                      <div style={{ fontSize: 11, color: "var(--mk-text-muted)", fontStyle: "italic", marginTop: 6, lineHeight: 1.5 }}>
                        &quot;{ticket.sentimento_motivo}&quot;
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: "var(--mk-text-muted)", marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
                      <i className="ti ti-lock" /> Registrado — análise única por atendimento.
                    </div>
                  </>
                ) : (
                  <>
                    <button onClick={gerarSentimento} className="cta-btn" style={{ width: "100%", fontSize: 12, justifyContent: "center" }}>
                      <i className="ti ti-sparkles" /> Analisar sentimento
                    </button>
                    <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--mk-surface-2)", borderRadius: 8, border: "0.5px solid var(--mk-border)", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: 8, alignItems: "start", fontSize: 10.5, color: "var(--mk-text-muted)", lineHeight: 1.5 }}>
                        <i className="ti ti-lock" style={{ fontSize: 13, color: "var(--mk-text-secondary)", marginTop: 1 }} />
                        <span>Pode rodar <strong>uma única vez</strong>. Faça no fim do atendimento.</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: 8, alignItems: "start", fontSize: 10.5, color: "var(--mk-text-muted)", lineHeight: 1.5 }}>
                        <i className="ti ti-chart-bar" style={{ fontSize: 13, color: "var(--mk-text-secondary)", marginTop: 1 }} />
                        <span>Entra na <strong>satisfação do Dashboard</strong>.</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </>
        )}

        {tab === "util" && (
          <>
            <Card titulo="Comunicação">
              <div style={{ padding: "8px 12px" }}>
                <button onClick={abrirLogTicket} className="ghost-btn" style={{ fontSize: 11, width: "100%" }}>
                  <i className="ti ti-list" /> Log do ticket
                </button>
              </div>
            </Card>

            <Card titulo="Exportar conversa">
              <div style={{ padding: "10px 14px", display: "flex", gap: 8 }}>
                <button onClick={() => baixarPDF(ticket.id, ticket.numero)} className="ghost-btn" style={{ fontSize: 11, flex: 1, justifyContent: "center" }} title="Baixa o PDF da conversa">
                  <i className="ti ti-download" /> Baixar PDF
                </button>
                <button onClick={() => imprimirConversa(ticket.id)} className="ghost-btn" style={{ fontSize: 11, flex: 1, justifyContent: "center" }} title="Abre o diálogo de impressão">
                  <i className="ti ti-printer" /> Imprimir
                </button>
              </div>
            </Card>
            <Card titulo="Sanitizar contato">
              <div style={{ padding: "10px 14px" }}>
                <p style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginBottom: 8, lineHeight: 1.5 }}>
                  Remove nome, telefone, email e CPF do contato (LGPD). Mensagens preservadas.
                </p>
                <button onClick={() => sanitizar(contato.id)} className="ghost-btn" style={{ fontSize: 11, width: "100%", color: "#C97064" }}>
                  <i className="ti ti-eraser" /> Remover dados sensíveis
                </button>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* MODAL LOG */}
      {modalLog && (
        <ModalLog
          titulo={modalLog === "ticket" ? `Logs do ticket — #${ticket.numero}` : `Logs de notas — #${ticket.numero}`}
          onClose={() => setModalLog(null)}
        >
          {modalLog === "ticket" ? (
            logsTicket.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--mk-text-muted)", padding: 30 }}>Sem registros.</div>
            ) : (
              logsTicket.map((l) => {
                const usr = Array.isArray(l.usuario) ? l.usuario[0] : l.usuario;
                return (
                  <div key={l.id} style={logRowStyle}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--mk-text)" }}>{usr?.nome || "Sistema"}</div>
                    <div style={{ fontSize: 11, color: "var(--mk-text-secondary)", marginTop: 2 }}>
                      {labelAcao(l.acao)} {l.entidade && `· ${l.entidade}`}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 4 }}>
                      {new Date(l.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            notas.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--mk-text-muted)", padding: 30 }}>Sem notas.</div>
            ) : (
              notas.map((n) => {
                const usr = Array.isArray(n.usuario) ? n.usuario[0] : n.usuario;
                return (
                  <div key={n.id} style={logRowStyle}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--mk-text)" }}>{usr?.nome || "—"}</div>
                    <div style={{ fontSize: 12, color: "var(--mk-text-secondary)", marginTop: 4, whiteSpace: "pre-wrap" }}>{n.conteudo}</div>
                    <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 6 }}>
                      {new Date(n.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    </div>
                  </div>
                );
              })
            )
          )}
        </ModalLog>
      )}

      {/* MODAL Adicionar Etiqueta/Flag — via portal pra escapar do transform translateX do painel */}
      {showEtiquetaPicker && typeof window !== "undefined" && createPortal(
        (() => {
          const cat = showEtiquetaPicker;
          const labelSingular = cat === "flag" ? "flag" : "etiqueta";
          const labelTitulo = cat === "flag" ? "Adicionar Flag" : "Adicionar Etiqueta";
          const disponiveis = todasEtiquetas.filter((t) => (t.categoria || "etiqueta") === cat);
          return (
            <div
              onClick={() => { setShowEtiquetaPicker(null); setNovaEtiquetaNome(""); }}
              style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ background: "var(--mk-bg)", border: "0.5px solid var(--mk-border)", borderRadius: 12, width: "min(460px, 92vw)", maxHeight: "75vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.55)" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "0.5px solid var(--mk-border)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{labelTitulo}</div>
                  <button onClick={() => { setShowEtiquetaPicker(null); setNovaEtiquetaNome(""); }} style={{ background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", fontSize: 16 }}><i className="ti ti-x" /></button>
                </div>

                <div style={{ padding: 14, overflowY: "auto" }} className="chat-scroll">
                  <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", letterSpacing: 0.4, marginBottom: 8 }}>EXISTENTES</div>
                  {disponiveis.length === 0 ? (
                    <div style={{ fontSize: 11, color: "var(--mk-text-muted)", padding: "6px 0" }}>Nenhuma {labelSingular} criada ainda.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {disponiveis.map((t) => {
                        const jaAplicada = !!etiquetas.find((e) => e.id === t.id);
                        return (
                          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 6px", borderRadius: 6, background: jaAplicada ? "var(--mk-surface-2)" : "transparent" }}>
                            <button
                              onClick={() => !jaAplicada && addEtiqueta(t.id)}
                              disabled={jaAplicada}
                              style={{ flex: 1, fontSize: 11, padding: "5px 10px", borderRadius: 12, background: `${t.cor}22`, color: t.cor, border: `0.5px solid ${t.cor}`, cursor: jaAplicada ? "default" : "pointer", textAlign: "left", opacity: jaAplicada ? 0.55 : 1 }}
                              title={jaAplicada ? "Já aplicada neste contato" : "Aplicar"}
                            >
                              {cat === "flag" && <i className="ti ti-flag" style={{ marginRight: 4, fontSize: 10 }} />}{t.nome}{jaAplicada && " ✓"}
                            </button>
                            <button onClick={() => editarEtiqueta(t.id, t.nome)} title="Renomear" style={{ background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", padding: "4px 6px", fontSize: 13 }}>
                              <i className="ti ti-pencil" />
                            </button>
                            <button onClick={() => excluirEtiqueta(t.id, t.nome)} title="Excluir" style={{ background: "transparent", border: 0, color: "#C97064", cursor: "pointer", padding: "4px 6px", fontSize: 13 }}>
                              <i className="ti ti-trash" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", letterSpacing: 0.4, margin: "16px 0 6px" }}>CRIAR NOVA</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={novaEtiquetaNome}
                      onChange={(e) => setNovaEtiquetaNome(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && novaEtiquetaNome.trim() && addEtiqueta(undefined, novaEtiquetaNome, cat)}
                      placeholder={`Nome da ${labelSingular}`}
                      autoFocus
                      style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12 }}
                    />
                    <button
                      onClick={() => novaEtiquetaNome.trim() && addEtiqueta(undefined, novaEtiquetaNome, cat)}
                      disabled={!novaEtiquetaNome.trim()}
                      className="cta-btn"
                      style={{ fontSize: 11, padding: "7px 14px" }}
                    >
                      <i className="ti ti-plus" /> Criar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}

function ModalLog({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--mk-bg)", border: "0.5px solid var(--mk-border)", borderRadius: 14, width: "min(540px, 92vw)", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 12px 40px rgba(0,0,0,0.45)" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "0.5px solid var(--mk-border)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{titulo}</h3>
          <button onClick={onClose} style={{ background: "var(--mk-surface)", border: "0.5px solid var(--mk-border)", borderRadius: "50%", width: 30, height: 30, color: "var(--mk-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Card({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--mk-surface)", border: "0.5px solid var(--mk-border)", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
      {titulo && (
        <div style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--mk-border)", fontSize: 12, fontWeight: 600, color: "var(--mk-text)", letterSpacing: 0.2 }}>
          {titulo}
        </div>
      )}
      {children}
    </div>
  );
}

function InfoLinha({ icon, label, value, mono, noBorder, copy }: { icon: string; label: string; value: string; mono?: boolean; noBorder?: boolean; copy?: string | null }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px", borderBottom: noBorder ? 0 : "0.5px solid var(--mk-border)" }}>
      <i className={`ti ${icon}`} style={{ fontSize: 14, color: "var(--mk-text-muted)", marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9.5, color: "var(--mk-text-muted)", fontFamily: "monospace", letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
        <div style={{ fontSize: 12.5, color: "var(--mk-text)", fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-word" }}>{value}</div>
      </div>
      {copy && (
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(copy);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1500);
            } catch {}
          }}
          title="Copiar"
          style={{ background: "transparent", border: 0, color: copiado ? "#10b981" : "var(--mk-text-muted)", cursor: "pointer", fontSize: 14, padding: "2px 4px", marginTop: 2 }}
        >
          <i className={`ti ${copiado ? "ti-check" : "ti-copy"}`} />
        </button>
      )}
    </div>
  );
}

const DDD_ESTADO: Record<string, string> = {
  "11": "SP", "12": "SP", "13": "SP", "14": "SP", "15": "SP", "16": "SP", "17": "SP", "18": "SP", "19": "SP",
  "21": "RJ", "22": "RJ", "24": "RJ",
  "27": "ES", "28": "ES",
  "31": "MG", "32": "MG", "33": "MG", "34": "MG", "35": "MG", "37": "MG", "38": "MG",
  "41": "PR", "42": "PR", "43": "PR", "44": "PR", "45": "PR", "46": "PR",
  "47": "SC", "48": "SC", "49": "SC",
  "51": "RS", "53": "RS", "54": "RS", "55": "RS",
  "61": "DF",
  "62": "GO", "64": "GO",
  "63": "TO",
  "65": "MT", "66": "MT",
  "67": "MS",
  "68": "AC",
  "69": "RO",
  "71": "BA", "73": "BA", "74": "BA", "75": "BA", "77": "BA",
  "79": "SE",
  "81": "PE", "87": "PE",
  "82": "AL",
  "83": "PB",
  "84": "RN",
  "85": "CE", "88": "CE",
  "86": "PI", "89": "PI",
  "91": "PA", "93": "PA", "94": "PA",
  "92": "AM", "97": "AM",
  "95": "RR",
  "96": "AP",
  "98": "MA", "99": "MA",
};

function estadoPorDDD(whatsapp: string | null | undefined): string {
  if (!whatsapp) return "";
  const digits = whatsapp.replace(/\D/g, "");
  // Formato esperado: 55 DD NNNNNNNNN. Pega 2 dígitos após o 55.
  const ddd = digits.startsWith("55") ? digits.slice(2, 4) : digits.slice(0, 2);
  return DDD_ESTADO[ddd] || "—";
}

function formatarTel(whatsapp: string | null | undefined): string {
  if (!whatsapp) return "—";
  const d = whatsapp.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return whatsapp;
}

function labelAcao(a: string): string {
  return ({
    create: "Criou",
    update: "Atualizou",
    delete: "Removeu",
    open_ticket: "Abriu atendimento",
    close_ticket: "Encerrou atendimento",
    send_message: "Enviou mensagem",
    view: "Visualizou",
    ticket_transferir: "Transferiu",
    ticket_retornar_fila: "Retornou à fila",
    ticket_transferir_canal: "Transferiu canal",
    ticket_marcar_lido: "Marcou como lido",
    config_change: "Mudou config",
  } as Record<string, string>)[a] || a;
}

const logRowStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "0.5px solid var(--mk-border)",
  background: "var(--mk-surface)",
};

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", fontFamily: "monospace", marginBottom: 6, letterSpacing: 0.5 }}>{titulo.toUpperCase()}</div>
      <div>{children}</div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>{children}</div>;
}
