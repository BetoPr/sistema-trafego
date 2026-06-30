"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Balao } from "@/components/ui/Balao";
import { setEtiquetasContato } from "./_actions";

interface Etiqueta { id: string; nome: string; cor: string; ativo: boolean }
interface Contato { id: string; nome: string; whatsapp: string | null; foto_url: string | null }

export function EtiquetasKanbanClient({
  etiquetas,
  contatos,
  contatosPorEtiqueta,
}: {
  etiquetas: Etiqueta[];
  contatos: Contato[];
  contatosPorEtiqueta: Record<string, string[]>;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState<"todas" | "ativas" | "inativas">("ativas");
  const [editAberto, setEditAberto] = useState<{ contato: Contato; etiquetasAtuais: Set<string> } | null>(null);
  const [editSel, setEditSel] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState(false);
  const [espiarAberto, setEspiarAberto] = useState<Contato | null>(null);
  const [espiarMsgs, setEspiarMsgs] = useState<Array<{ id: string; autor: string; conteudo: string | null; tipo: string; transcricao: string | null; created_at: string }>>([]);
  const [espiarTicket, setEspiarTicket] = useState<{ id: string; numero: number } | null>(null);
  const [espiarLoading, setEspiarLoading] = useState(false);

  useEffect(() => {
    if (!espiarAberto) { setEspiarMsgs([]); setEspiarTicket(null); return; }
    setEspiarLoading(true);
    fetch(`/api/contatos/${espiarAberto.id}/espiar`)
      .then((r) => r.json())
      .then((j) => {
        setEspiarMsgs(j.mensagens || []);
        setEspiarTicket(j.ticket || null);
      })
      .catch(() => {})
      .finally(() => setEspiarLoading(false));
  }, [espiarAberto]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const etiquetasFiltradas = useMemo(() => {
    if (filtroAtivo === "ativas") return etiquetas.filter((e) => e.ativo);
    if (filtroAtivo === "inativas") return etiquetas.filter((e) => !e.ativo);
    return etiquetas;
  }, [etiquetas, filtroAtivo]);

  function scroll(dir: "esq" | "dir") {
    const el = scrollRef.current;
    if (!el) return;
    const delta = 300;
    el.scrollBy({ left: dir === "esq" ? -delta : delta, behavior: "smooth" });
  }

  const contatoIndex = useMemo(() => {
    const m = new Map<string, Contato>();
    for (const c of contatos) m.set(c.id, c);
    return m;
  }, [contatos]);

  function contatosFiltrados(etiquetaId: string): Contato[] {
    const ids = contatosPorEtiqueta[etiquetaId] || [];
    let resultado = ids.map((id) => contatoIndex.get(id)).filter(Boolean) as Contato[];
    const q = busca.trim().toLowerCase();
    if (q) {
      resultado = resultado.filter((c) => c.nome.toLowerCase().includes(q) || (c.whatsapp || "").includes(q));
    }
    return resultado;
  }

  function iniciarEdit(contato: Contato) {
    const etiquetasAtuais = new Set<string>();
    for (const e of etiquetas) {
      if ((contatosPorEtiqueta[e.id] || []).includes(contato.id)) etiquetasAtuais.add(e.id);
    }
    setEditAberto({ contato, etiquetasAtuais });
    setEditSel(new Set(etiquetasAtuais));
  }

  async function salvarEdit() {
    if (!editAberto) return;
    setSalvando(true);
    const r = await setEtiquetasContato(editAberto.contato.id, Array.from(editSel));
    setSalvando(false);
    if (r.ok) {
      setEditAberto(null);
      router.refresh();
    } else alert(r.msg);
  }

  function iniciarAtendimento(c: Contato) {
    if (typeof window !== "undefined") {
      window.open(`/atendimentos?contato=${c.id}`, "_blank");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar contato..."
          style={{ flex: 1, minWidth: 200, padding: "9px 12px", background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "var(--mk-text)", fontSize: 13, outline: "none" }}
        />
        <select
          value={filtroAtivo}
          onChange={(e) => setFiltroAtivo(e.target.value as "todas" | "ativas" | "inativas")}
          style={{ background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", color: "var(--mk-text)", fontSize: 12.5, padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}
        >
          <option value="ativas">Ativas</option>
          <option value="todas">Todas</option>
          <option value="inativas">Inativas</option>
        </select>
        <button type="button" onClick={() => router.refresh()} style={{ background: "transparent", border: ".5px solid var(--mk-border)", color: "var(--mk-text)", fontSize: 12.5, padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}>
          <i className="ti ti-refresh" style={{ marginRight: 4 }} /> Atualizar
        </button>
        <div style={{ display: "inline-flex", gap: 4, marginLeft: "auto" }}>
          <button type="button" onClick={() => scroll("esq")} title="Rolar pra esquerda" style={{ width: 34, height: 34, background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", color: "var(--mk-text)", borderRadius: 8, cursor: "pointer" }}>
            <i className="ti ti-chevron-left" />
          </button>
          <button type="button" onClick={() => scroll("dir")} title="Rolar pra direita" style={{ width: 34, height: 34, background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", color: "var(--mk-text)", borderRadius: 8, cursor: "pointer" }}>
            <i className="ti ti-chevron-right" />
          </button>
        </div>
      </div>

      {etiquetasFiltradas.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "var(--mk-surface)", border: "1px dashed var(--mk-border)", borderRadius: 12 }}>
          <i className="ti ti-tag" style={{ fontSize: 36, color: "var(--mk-text-muted)", marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>{etiquetas.length === 0 ? "Nenhuma etiqueta criada ainda" : "Nenhuma etiqueta neste filtro"}</div>
          <div style={{ fontSize: 12, color: "var(--mk-text-muted)", marginTop: 6 }}>{etiquetas.length === 0 ? "Vá em Recursos · Etiquetas pra criar a primeira." : "Tenta trocar pra Todas ou Ativas."}</div>
        </div>
      ) : (
        <div ref={scrollRef} style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16, minHeight: 400 }}>
          {etiquetasFiltradas.map((etq) => {
            const cs = contatosFiltrados(etq.id);
            return (
              <div
                key={etq.id}
                style={{
                  minWidth: 280,
                  maxWidth: 280,
                  background: "var(--mk-surface)",
                  border: ".5px solid var(--mk-border)",
                  borderTop: `3px solid ${etq.cor}`,
                  borderRadius: 10,
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: etq.cor }} />
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{etq.nome}</span>
                    <span style={{ fontSize: 9, color: "var(--mk-text-muted)", fontFamily: "monospace" }} title={etq.id}>#{etq.id.slice(0, 6)}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--mk-text-muted)", padding: "1px 6px", background: "var(--mk-surface-2)", borderRadius: 999 }}>{cs.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "60vh", overflowY: "auto", paddingRight: 2 }}>
                  {cs.length === 0 && (
                    <div style={{ fontSize: 11, color: "var(--mk-text-muted)", padding: 10, textAlign: "center" }}>Nenhum contato.</div>
                  )}
                  {cs.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: 10,
                        background: "var(--mk-surface-2)",
                        border: ".5px solid var(--mk-border)",
                        borderRadius: 8,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <i className="ti ti-user" style={{ fontSize: 14, color: "var(--mk-text-muted)" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</div>
                          {c.whatsapp && <div style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>{c.whatsapp}</div>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button type="button" onClick={() => setEspiarAberto(c)} title="Espiar" style={iconBtn}>
                          <i className="ti ti-eye" />
                        </button>
                        <button type="button" onClick={() => iniciarEdit(c)} title="Editar etiquetas" style={iconBtn}>
                          <i className="ti ti-tag" />
                        </button>
                        <button type="button" onClick={() => iniciarAtendimento(c)} title="Iniciar atendimento" style={{ ...iconBtn, color: "#00E19A" }}>
                          <i className="ti ti-message-circle" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Balão Espiar */}
      <Balao
        open={!!espiarAberto}
        onClose={() => setEspiarAberto(null)}
        titulo={espiarAberto ? <>Espiando — {espiarAberto.nome} {espiarTicket && <span style={{ color: "var(--mk-text-muted)", fontWeight: 400, fontFamily: "monospace", fontSize: 11 }}>#{espiarTicket.numero}</span>}</> : "Espiar"}
        icone="ti-eye"
        largura={560}
        footer={espiarAberto && (
          <button type="button" onClick={() => espiarAberto && iniciarAtendimento(espiarAberto)} className="cta-btn" style={{ fontSize: 12.5, padding: "8px 14px" }}>
            <i className="ti ti-arrow-right" style={{ marginRight: 6 }} /> Atender
          </button>
        )}
      >
        <div style={{ padding: "4px 0", display: "flex", flexDirection: "column", gap: 8 }}>
          {espiarLoading ? (
            <div style={{ textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12, padding: 30 }}>Carregando…</div>
          ) : !espiarTicket ? (
            <div style={{ textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12, padding: 30 }}>
              <i className="ti ti-message-off" style={{ display: "block", fontSize: 26, marginBottom: 6, opacity: 0.6 }} />
              Sem ticket pra este contato ainda.
            </div>
          ) : espiarMsgs.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12, padding: 30 }}>Sem mensagens.</div>
          ) : (
            espiarMsgs.map((m) => {
              const eu = m.autor !== "cliente";
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: eu ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "78%", padding: "8px 11px", borderRadius: 10, background: eu ? "rgba(0,225,154,0.10)" : "var(--mk-surface-2)", border: ".5px solid var(--mk-border)" }}>
                    {m.tipo === "audio" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#00E19A", fontWeight: 600 }}>
                        <i className="ti ti-player-play-filled" /> Áudio
                      </div>
                    )}
                    {m.transcricao && (
                      <div style={{ fontSize: 11, color: "var(--mk-text-muted)", fontStyle: "italic", marginTop: 4, borderTop: ".5px solid var(--mk-border)", paddingTop: 4 }}>
                        <strong style={{ color: "#9B7DBF" }}>TRANSCRIÇÃO:</strong> {m.transcricao}
                      </div>
                    )}
                    {m.conteudo && (
                      <div style={{ fontSize: 12.5, color: "var(--mk-text)", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{m.conteudo}</div>
                    )}
                    <div style={{ fontSize: 9.5, color: "var(--mk-text-muted)", textAlign: "right", marginTop: 4 }}>
                      {new Date(m.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Balao>

      {/* Balão Editar Etiquetas */}
      <Balao open={!!editAberto} onClose={() => setEditAberto(null)} titulo={`Etiquetas · "${editAberto?.contato.nome || ""}"`} icone="ti-tag" largura={480}>
        <div style={{ padding: "8px 4px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)" }}>Marca as etiquetas aplicadas a este contato. Salva tudo de uma vez.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "50vh", overflowY: "auto" }}>
            {etiquetas.map((etq) => {
              const marcada = editSel.has(etq.id);
              return (
                <label
                  key={etq.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    background: marcada ? `${etq.cor}22` : "var(--mk-surface)",
                    border: marcada ? `.5px solid ${etq.cor}` : ".5px solid var(--mk-border)",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={(e) => {
                      setEditSel((s) => {
                        const n = new Set(s);
                        if (e.target.checked) n.add(etq.id);
                        else n.delete(etq.id);
                        return n;
                      });
                    }}
                  />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: etq.cor }} />
                  <span style={{ fontSize: 12.5 }}>{etq.nome}</span>
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={() => setEditAberto(null)} style={btnGhost}>Cancelar</button>
            <button type="button" onClick={salvarEdit} disabled={salvando} className="cta-btn" style={{ fontSize: 12.5, padding: "8px 16px", opacity: salvando ? 0.6 : 1 }}>
              Salvar
            </button>
          </div>
        </div>
      </Balao>
    </div>
  );
}

const iconBtn: React.CSSProperties = { background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", fontSize: 14, padding: 4 };
const btnGhost: React.CSSProperties = { background: "transparent", border: ".5px solid var(--mk-border)", color: "var(--mk-text)", fontSize: 12.5, padding: "8px 14px", borderRadius: 8, cursor: "pointer" };
