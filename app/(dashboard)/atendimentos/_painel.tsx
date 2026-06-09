"use client";

import { useState } from "react";
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
}

interface Tag {
  id: string;
  nome: string;
  cor: string;
}

interface Props {
  ticket: Ticket;
  contato: Contato;
  etiquetas: Tag[];
  todasEtiquetas?: Tag[];
}

export function PainelDireito({ ticket, contato, etiquetas, todasEtiquetas = [] }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"perfil" | "atend" | "util">("perfil");
  const [loadingResumo, setLoadingResumo] = useState(false);
  const [loadingSent, setLoadingSent] = useState(false);
  const [streamingResumo, setStreamingResumo] = useState<string>("");
  const [streamingActive, setStreamingActive] = useState(false);
  const [showEtiquetaPicker, setShowEtiquetaPicker] = useState(false);
  const [novaEtiquetaNome, setNovaEtiquetaNome] = useState("");
  const [modalLog, setModalLog] = useState<null | "ticket" | "notas">(null);
  const [logsTicket, setLogsTicket] = useState<Array<{ id: string; acao: string; entidade: string | null; created_at: string; usuario?: { nome?: string } | { nome?: string }[] | null; payload?: Record<string, unknown> | null }>>([]);
  const [notas, setNotas] = useState<Array<{ id: string; conteudo: string; created_at: string; usuario?: { nome?: string } | { nome?: string }[] | null }>>([]);
  const [novaNota, setNovaNota] = useState("");

  async function addEtiqueta(etiquetaId?: string, nome?: string) {
    try {
      const r = await fetch(`/api/contatos/${contato.id}/etiquetas`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(etiquetaId ? { etiquetaId } : { nome, cor: corAleatoria() }),
      });
      const j = await r.json();
      if (!r.ok) alert(`Erro: ${j.error}`);
      else { router.refresh(); setShowEtiquetaPicker(false); setNovaEtiquetaNome(""); }
    } catch (e) { alert(`Erro: ${e instanceof Error ? e.message : String(e)}`); }
  }

  async function removeEtiqueta(etiquetaId: string) {
    if (!confirm("Remover etiqueta?")) return;
    try {
      const r = await fetch(`/api/contatos/${contato.id}/etiquetas?etiquetaId=${etiquetaId}`, { method: "DELETE" });
      if (r.ok) router.refresh();
    } catch {}
  }

  function corAleatoria() {
    const cores = ["#C9A876", "#9B7DBF", "#5B8BA6", "#6B8E4E", "#C97064", "#D4A574"];
    return cores[Math.floor(Math.random() * cores.length)];
  }

  async function marcarLido(lido: boolean) {
    try {
      const r = await fetch(`/api/atendimentos/${ticket.id}/marcar-lido`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lido }),
      });
      if (r.ok) router.refresh();
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
              router.refresh();
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
      else router.refresh();
    } finally {
      setLoadingSent(false);
    }
  }

  const sentimentoCor = ticket.sentimento === "muito_bom" ? "#6B8E4E" : ticket.sentimento === "bom" ? "#5B8BA6" : ticket.sentimento === "ruim" ? "#C97064" : "var(--mk-text-muted)";
  const sentimentoLabel = ticket.sentimento === "muito_bom" ? "Muito bom" : ticket.sentimento === "bom" ? "Bom" : ticket.sentimento === "ruim" ? "Ruim" : "Não analisado";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--mk-border)", fontSize: 13, fontWeight: 600 }}>Detalhes do contato</div>
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

      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {tab === "perfil" && (
          <>
            {/* CARD info do cliente com separadores */}
            <Card>
              <div style={{ textAlign: "center", padding: "14px 12px 8px" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(155,125,191,0.25)", color: "#9B7DBF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 22 }}>
                  {contato.nome.slice(0, 2).toUpperCase()}
                </div>
              </div>
              <InfoLinha icon="ti-user" label="Nome" value={contato.nome} />
              <InfoLinha icon="ti-phone" label="Telefone" value={contato.whatsapp || "—"} mono />
              <InfoLinha icon="ti-mail" label="Email" value={contato.email || "—"} />
              <InfoLinha icon="ti-briefcase" label="Empresa" value={contato.empresa || "—"} />
              <InfoLinha icon="ti-map-pin" label="Cidade" value={contato.cidade ? `${contato.cidade}${contato.estado ? `/${contato.estado}` : ""}` : "—"} />
              <InfoLinha icon="ti-id" label="CPF/CNPJ" value={contato.cpf || "—"} mono noBorder />
              <div style={{ display: "flex", gap: 6, padding: "10px 12px 12px", borderTop: "0.5px solid var(--mk-border)" }}>
                <a href={`/contatos?editar=${contato.id}`} className="ghost-btn" style={{ flex: 1, fontSize: 11, textAlign: "center" }}>
                  <i className="ti ti-edit" /> Editar
                </a>
              </div>
            </Card>

            {/* CARD etiquetas */}
            <Card titulo="Etiquetas">
              {etiquetas.length > 0 ? (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "10px 12px" }}>
                  {etiquetas.map((e) => (
                    <span key={e.id} onClick={() => removeEtiqueta(e.id)} title="Clique pra remover" style={{ fontSize: 10, padding: "3px 8px", borderRadius: 12, background: `${e.cor}33`, color: e.cor, border: `0.5px solid ${e.cor}`, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {e.nome} <i className="ti ti-x" style={{ fontSize: 9 }} />
                    </span>
                  ))}
                </div>
              ) : <div style={{ padding: "10px 12px", fontSize: 11, color: "var(--mk-text-muted)" }}>Sem etiquetas</div>}
              <div style={{ borderTop: "0.5px solid var(--mk-border)", padding: "8px 12px" }}>
                {!showEtiquetaPicker ? (
                  <button onClick={() => setShowEtiquetaPicker(true)} className="ghost-btn" style={{ fontSize: 11, width: "100%" }}>
                    <i className="ti ti-plus" /> Adicionar tag
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {todasEtiquetas.filter((t) => !etiquetas.find((e) => e.id === t.id)).length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxHeight: 100, overflowY: "auto" }}>
                        {todasEtiquetas.filter((t) => !etiquetas.find((e) => e.id === t.id)).map((t) => (
                          <button key={t.id} onClick={() => addEtiqueta(t.id)} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${t.cor}33`, color: t.cor, border: `0.5px solid ${t.cor}`, cursor: "pointer" }}>
                            {t.nome}
                          </button>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 4 }}>
                      <input value={novaEtiquetaNome} onChange={(e) => setNovaEtiquetaNome(e.target.value)} placeholder="Nova tag…" style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 11 }} />
                      <button onClick={() => novaEtiquetaNome.trim() && addEtiqueta(undefined, novaEtiquetaNome)} disabled={!novaEtiquetaNome.trim()} className="cta-btn" style={{ fontSize: 11, padding: "5px 10px" }}>Criar</button>
                      <button onClick={() => { setShowEtiquetaPicker(false); setNovaEtiquetaNome(""); }} className="ghost-btn" style={{ fontSize: 11, padding: "5px 8px" }}><i className="ti ti-x" /></button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* CARD Comunicação */}
            <Card titulo="Comunicação">
              <div style={{ display: "flex", gap: 4, padding: "10px 12px" }}>
                <button onClick={() => marcarLido(true)} className="ghost-btn" style={{ flex: 1, fontSize: 10.5, padding: "6px 4px" }}>
                  <i className="ti ti-mail-opened" /> Marcar lido
                </button>
                <button onClick={() => marcarLido(false)} className="ghost-btn" style={{ flex: 1, fontSize: 10.5, padding: "6px 4px" }}>
                  <i className="ti ti-mail" /> Não lido
                </button>
              </div>
              <div style={{ borderTop: "0.5px solid var(--mk-border)", padding: "8px 12px" }}>
                <button onClick={abrirLogTicket} className="ghost-btn" style={{ fontSize: 11, width: "100%" }}>
                  <i className="ti ti-list" /> Log do ticket
                </button>
              </div>
            </Card>

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
                  Atualizado: {new Date(ticket.resumo_atualizado_em).toLocaleString("pt-BR")}
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
            <Section titulo="Sentimento (IA)">
              <div style={{ fontSize: 12, color: sentimentoCor, fontWeight: 600, marginBottom: 4 }}>
                <i className="ti ti-mood-smile" /> {sentimentoLabel}
                {ticket.sentimento_confianca !== null && ` · ${ticket.sentimento_confianca}%`}
              </div>
              {ticket.sentimento_motivo && (
                <div style={{ fontSize: 11, color: "var(--mk-text-muted)", fontStyle: "italic" }}>“{ticket.sentimento_motivo}”</div>
              )}
              <button onClick={gerarSentimento} disabled={loadingSent} className="ghost-btn" style={{ marginTop: 8, fontSize: 11, width: "100%" }}>
                <i className="ti ti-refresh" /> {loadingSent ? "Analisando..." : "Re-analisar"}
              </button>
            </Section>

            <Section titulo="Protocolo">
              <Empty>Não emitido</Empty>
            </Section>
            <Section titulo="Avaliação">
              <Empty>Não enviada</Empty>
            </Section>
            <Section titulo="Notas">
              <Empty>Sem notas</Empty>
            </Section>
          </>
        )}

        {tab === "util" && (
          <>
            <Section titulo="Exportar conversa">
              <button className="ghost-btn" style={{ fontSize: 11, width: "100%" }} disabled><i className="ti ti-file-export" /> Exportar PDF (em breve)</button>
            </Section>
            <Section titulo="Sanitizar contato">
              <button className="ghost-btn" style={{ fontSize: 11, width: "100%", color: "#C97064" }} disabled><i className="ti ti-eraser" /> Remover dados sensíveis (em breve)</button>
            </Section>
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
                      {new Date(l.created_at).toLocaleString("pt-BR")}
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
                      {new Date(n.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                );
              })
            )
          )}
        </ModalLog>
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

function InfoLinha({ icon, label, value, mono, noBorder }: { icon: string; label: string; value: string; mono?: boolean; noBorder?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px", borderBottom: noBorder ? 0 : "0.5px solid var(--mk-border)" }}>
      <i className={`ti ${icon}`} style={{ fontSize: 14, color: "var(--mk-text-muted)", marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9.5, color: "var(--mk-text-muted)", fontFamily: "monospace", letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
        <div style={{ fontSize: 12.5, color: "var(--mk-text)", fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-word" }}>{value}</div>
      </div>
    </div>
  );
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
