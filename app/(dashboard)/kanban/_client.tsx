"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Balao } from "@/components/ui/Balao";
import { criarQuadro, deletarQuadro, criarColuna, deletarColuna, criarCard, deletarCard, moverCard, salvarRegrasEtiqueta } from "./_actions";

interface Quadro { id: string; nome: string; descricao: string | null; cor: string }
interface Coluna { id: string; nome: string; cor: string; ordem: number }
interface Card { id: string; coluna_id: string; titulo: string; descricao: string | null; ordem: number; valor: number | null }

interface Etiqueta { id: string; nome: string; cor: string }

interface Props {
  quadros: Quadro[];
  quadroAtivoId: string | null;
  colunas: Coluna[];
  cards: Card[];
  etiquetas: Etiqueta[];
  regrasPorColuna: Record<string, string[]>;
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PALETA = ["#00E19A", "#5cd0ff", "#9B7DBF", "#FFB547", "#FF5C72", "#6B8E4E"];

export function KanbanClient({ quadros, quadroAtivoId, colunas, cards, etiquetas, regrasPorColuna }: Props) {
  const router = useRouter();
  const [novoQuadroAberto, setNovoQuadroAberto] = useState(false);
  const [novoQuadroNome, setNovoQuadroNome] = useState("");
  const [novoQuadroDesc, setNovoQuadroDesc] = useState("");
  const [novoQuadroCor, setNovoQuadroCor] = useState(PALETA[0]);
  const [novaColunaAberto, setNovaColunaAberto] = useState(false);
  const [novaColunaNome, setNovaColunaNome] = useState("");
  const [novaColunaCor, setNovaColunaCor] = useState(PALETA[1]);
  const [novoCardAberto, setNovoCardAberto] = useState<{ colunaId: string } | null>(null);
  const [regrasAberto, setRegrasAberto] = useState<{ colunaId: string; colunaNome: string } | null>(null);
  const [regrasSelecionadas, setRegrasSelecionadas] = useState<Set<string>>(new Set());
  const [salvandoRegras, setSalvandoRegras] = useState(false);
  const [novoCardTitulo, setNovoCardTitulo] = useState("");
  const [novoCardDesc, setNovoCardDesc] = useState("");
  const [, startTransition] = useTransition();

  // Drag-and-drop nativo
  const [arrastando, setArrastando] = useState<string | null>(null);

  function trocarQuadro(id: string) {
    router.push(`/kanban?quadro=${id}`);
  }

  async function criarQuadroSubmit() {
    if (!novoQuadroNome.trim()) return;
    const r = await criarQuadro(novoQuadroNome, novoQuadroDesc, novoQuadroCor);
    if (r.ok && r.id) {
      setNovoQuadroAberto(false);
      setNovoQuadroNome("");
      setNovoQuadroDesc("");
      router.push(`/kanban?quadro=${r.id}`);
    } else alert(r.msg);
  }

  async function criarColunaSubmit() {
    if (!quadroAtivoId || !novaColunaNome.trim()) return;
    const r = await criarColuna(quadroAtivoId, novaColunaNome, novaColunaCor);
    if (r.ok) {
      setNovaColunaAberto(false);
      setNovaColunaNome("");
      router.refresh();
    } else alert(r.msg);
  }

  async function criarCardSubmit() {
    if (!novoCardAberto || !novoCardTitulo.trim()) return;
    const r = await criarCard(novoCardAberto.colunaId, novoCardTitulo, novoCardDesc);
    if (r.ok) {
      setNovoCardAberto(null);
      setNovoCardTitulo("");
      setNovoCardDesc("");
      router.refresh();
    } else alert(r.msg);
  }

  async function dropCard(novaColunaId: string) {
    if (!arrastando) return;
    const cardOriginal = cards.find((c) => c.id === arrastando);
    if (!cardOriginal || cardOriginal.coluna_id === novaColunaId) {
      setArrastando(null);
      return;
    }
    const maxOrdem = cards.filter((c) => c.coluna_id === novaColunaId).reduce((m, c) => Math.max(m, c.ordem), -1);
    startTransition(async () => {
      await moverCard(arrastando, novaColunaId, maxOrdem + 1);
      router.refresh();
    });
    setArrastando(null);
  }

  return (
    <section className="mk-page">
      <div className="mk-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="mk-eyebrow">Recursos · Papipeline</div>
          <h1 className="mk-page-title">Kanban</h1>
          <p className="mk-page-sub">Organize processos, vendas, tarefas. Arrasta os cards entre colunas.</p>
        </div>
        <button type="button" onClick={() => setNovoQuadroAberto(true)} className="cta-btn" style={{ fontSize: 12, padding: "8px 14px" }}>
          <i className="ti ti-plus" style={{ marginRight: 4 }} />
          Novo quadro
        </button>
      </div>

      {/* Tabs dos quadros */}
      {quadros.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {quadros.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => trocarQuadro(q.id)}
              style={{
                padding: "8px 14px",
                background: q.id === quadroAtivoId ? `${q.cor}22` : "var(--mk-surface)",
                border: q.id === quadroAtivoId ? `1px solid ${q.cor}` : ".5px solid var(--mk-border)",
                borderRadius: 8,
                color: q.id === quadroAtivoId ? q.cor : "var(--mk-text-secondary)",
                fontSize: 12.5,
                fontWeight: q.id === quadroAtivoId ? 700 : 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <i className="ti ti-layout-kanban" style={{ fontSize: 13 }} />
              {q.nome}
            </button>
          ))}
        </div>
      )}

      {quadros.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "var(--mk-surface)", border: "1px dashed var(--mk-border)", borderRadius: 12 }}>
          <i className="ti ti-layout-kanban" style={{ fontSize: 36, color: "var(--mk-text-muted)", marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Nenhum quadro ainda</div>
          <div style={{ fontSize: 12, color: "var(--mk-text-muted)", marginBottom: 14 }}>Crie seu primeiro Papipeline pra organizar processos.</div>
          <button type="button" onClick={() => setNovoQuadroAberto(true)} className="cta-btn" style={{ fontSize: 12.5, padding: "9px 18px" }}>
            Criar quadro
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16, minHeight: 400 }}>
          {colunas.map((col) => {
            const cardsDaCol = cards.filter((c) => c.coluna_id === col.id).sort((a, b) => a.ordem - b.ordem);
            return (
              <div
                key={col.id}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={() => dropCard(col.id)}
                style={{
                  minWidth: 280,
                  maxWidth: 280,
                  background: "var(--mk-surface)",
                  border: ".5px solid var(--mk-border)",
                  borderTop: `3px solid ${col.cor}`,
                  borderRadius: 10,
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.cor }} />
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{col.nome}</span>
                    <span style={{ fontSize: 10, color: "var(--mk-text-muted)", padding: "1px 6px", background: "var(--mk-surface-2)", borderRadius: 999 }}>{cardsDaCol.length}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setRegrasAberto({ colunaId: col.id, colunaNome: col.nome });
                        setRegrasSelecionadas(new Set(regrasPorColuna[col.id] || []));
                      }}
                      title="Conectar etiquetas → entrada automática"
                      style={{ background: "transparent", border: 0, color: (regrasPorColuna[col.id]?.length || 0) > 0 ? "#00E19A" : "var(--mk-text-muted)", cursor: "pointer", fontSize: 12, padding: 2, display: "inline-flex", alignItems: "center", gap: 2 }}
                    >
                      <i className="ti ti-link" />
                      {(regrasPorColuna[col.id]?.length || 0) > 0 && (
                        <span style={{ fontSize: 9, fontWeight: 700 }}>{regrasPorColuna[col.id].length}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`Deletar coluna "${col.nome}" e todos os ${cardsDaCol.length} cards?`)) return;
                        await deletarColuna(col.id);
                        router.refresh();
                      }}
                      title="Deletar coluna"
                      style={{ background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", fontSize: 12, padding: 2 }}
                    >
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 60 }}>
                  {cardsDaCol.map((card) => (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => setArrastando(card.id)}
                      onDragEnd={() => setArrastando(null)}
                      style={{
                        padding: 10,
                        background: "var(--mk-surface-2)",
                        border: ".5px solid var(--mk-border)",
                        borderRadius: 8,
                        cursor: "grab",
                        opacity: arrastando === card.id ? 0.4 : 1,
                        transition: "opacity 0.2s",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, flex: 1, lineHeight: 1.4 }}>{card.titulo}</div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm("Deletar card?")) return;
                            await deletarCard(card.id);
                            router.refresh();
                          }}
                          style={{ background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", padding: 0, fontSize: 11 }}
                        >
                          <i className="ti ti-x" />
                        </button>
                      </div>
                      {card.descricao && (
                        <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 4, lineHeight: 1.4 }}>{card.descricao}</div>
                      )}
                      {card.valor != null && (
                        <div style={{ fontSize: 11, color: "#00E19A", fontWeight: 600, marginTop: 6 }}>{BRL.format(card.valor)}</div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => { setNovoCardAberto({ colunaId: col.id }); setNovoCardTitulo(""); setNovoCardDesc(""); }}
                  style={{ background: "transparent", border: ".5px dashed var(--mk-border)", borderRadius: 8, color: "var(--mk-text-muted)", padding: "8px 10px", fontSize: 11.5, cursor: "pointer" }}
                >
                  <i className="ti ti-plus" style={{ marginRight: 4 }} /> Novo card
                </button>
              </div>
            );
          })}

          {quadroAtivoId && (
            <button
              type="button"
              onClick={() => setNovaColunaAberto(true)}
              style={{
                minWidth: 200,
                background: "transparent",
                border: ".5px dashed var(--mk-border)",
                borderRadius: 10,
                color: "var(--mk-text-muted)",
                fontSize: 12.5,
                cursor: "pointer",
                padding: 20,
              }}
            >
              <i className="ti ti-plus" style={{ marginRight: 6, fontSize: 16 }} />
              Nova coluna
            </button>
          )}
        </div>
      )}

      {quadroAtivoId && quadros.length > 0 && (
        <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={async () => {
              if (!confirm("Deletar este quadro inteiro? Cards e colunas vão junto.")) return;
              await deletarQuadro(quadroAtivoId);
              router.refresh();
              router.push("/kanban");
            }}
            style={{ background: "transparent", border: 0, color: "var(--mk-text-muted)", fontSize: 11, cursor: "pointer" }}
          >
            <i className="ti ti-trash" style={{ marginRight: 4 }} />
            Deletar quadro
          </button>
        </div>
      )}

      {/* Balão novo quadro */}
      <Balao open={novoQuadroAberto} onClose={() => setNovoQuadroAberto(false)} titulo="Novo quadro" icone="ti-layout-kanban" largura={460}>
        <div style={{ padding: "8px 4px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="text" value={novoQuadroNome} onChange={(e) => setNovoQuadroNome(e.target.value)} placeholder="Nome (ex: Pipeline de vendas)" style={inp} autoFocus />
          <textarea value={novoQuadroDesc} onChange={(e) => setNovoQuadroDesc(e.target.value)} placeholder="Descrição (opcional)" rows={2} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 6 }}>
            {PALETA.map((c) => (
              <button key={c} type="button" onClick={() => setNovoQuadroCor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: novoQuadroCor === c ? "2px solid var(--mk-text)" : "1px solid var(--mk-border)", cursor: "pointer" }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={() => setNovoQuadroAberto(false)} style={btnGhost}>Cancelar</button>
            <button type="button" onClick={criarQuadroSubmit} className="cta-btn" style={{ fontSize: 12.5, padding: "8px 16px" }}>Criar com 3 colunas padrão</button>
          </div>
        </div>
      </Balao>

      <Balao open={novaColunaAberto} onClose={() => setNovaColunaAberto(false)} titulo="Nova coluna" icone="ti-layout-columns" largura={400}>
        <div style={{ padding: "8px 4px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="text" value={novaColunaNome} onChange={(e) => setNovaColunaNome(e.target.value)} placeholder="Nome (ex: Em negociação)" style={inp} autoFocus />
          <div style={{ display: "flex", gap: 6 }}>
            {PALETA.map((c) => (
              <button key={c} type="button" onClick={() => setNovaColunaCor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: novaColunaCor === c ? "2px solid var(--mk-text)" : "1px solid var(--mk-border)", cursor: "pointer" }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={() => setNovaColunaAberto(false)} style={btnGhost}>Cancelar</button>
            <button type="button" onClick={criarColunaSubmit} className="cta-btn" style={{ fontSize: 12.5, padding: "8px 16px" }}>Criar</button>
          </div>
        </div>
      </Balao>

      {/* Balão Conectar Etiquetas */}
      <Balao open={!!regrasAberto} onClose={() => setRegrasAberto(null)} titulo={`Conectar etiquetas → "${regrasAberto?.colunaNome || ""}"`} icone="ti-link" largura={520}>
        <div style={{ padding: "8px 4px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ padding: 12, background: "rgba(0,225,154,0.06)", border: ".5px solid rgba(0,225,154,0.25)", borderRadius: 8, fontSize: 12, color: "var(--mk-text)", lineHeight: 1.5 }}>
            Quando um contato receber qualquer uma das etiquetas marcadas, vira card automaticamente nesta coluna. Não duplica: se já existe card desse contato no quadro, ignora.
          </div>
          {etiquetas.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12 }}>
              Nenhuma etiqueta cadastrada ainda. Cria em <strong>Configurações → Etiquetas</strong>.
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, padding: 4, background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 8 }}>
              {etiquetas.map((etq) => {
                const marcada = regrasSelecionadas.has(etq.id);
                return (
                  <label
                    key={etq.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      background: marcada ? `${etq.cor}15` : "transparent",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={marcada}
                      onChange={() => {
                        const novo = new Set(regrasSelecionadas);
                        if (marcada) novo.delete(etq.id);
                        else novo.add(etq.id);
                        setRegrasSelecionadas(novo);
                      }}
                      style={{ accentColor: etq.cor }}
                    />
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--mk-text)" }}>
                      <i className="ti ti-tag" style={{ color: etq.cor }} />
                      {etq.nome}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          <div style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>
            {regrasSelecionadas.size} etiqueta{regrasSelecionadas.size === 1 ? "" : "s"} selecionada{regrasSelecionadas.size === 1 ? "" : "s"}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={() => setRegrasAberto(null)} disabled={salvandoRegras} style={btnGhost}>Cancelar</button>
            <button
              type="button"
              disabled={salvandoRegras}
              onClick={async () => {
                if (!regrasAberto) return;
                setSalvandoRegras(true);
                const r = await salvarRegrasEtiqueta(regrasAberto.colunaId, Array.from(regrasSelecionadas));
                setSalvandoRegras(false);
                if (r.ok) {
                  setRegrasAberto(null);
                  router.refresh();
                } else alert(r.msg);
              }}
              className="cta-btn"
              style={{ fontSize: 12.5, padding: "8px 16px" }}
            >
              {salvandoRegras ? "Salvando..." : "Salvar conexões"}
            </button>
          </div>
        </div>
      </Balao>

      <Balao open={!!novoCardAberto} onClose={() => setNovoCardAberto(null)} titulo="Novo card" icone="ti-card" largura={420}>
        <div style={{ padding: "8px 4px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="text" value={novoCardTitulo} onChange={(e) => setNovoCardTitulo(e.target.value)} placeholder="Título" style={inp} autoFocus />
          <textarea value={novoCardDesc} onChange={(e) => setNovoCardDesc(e.target.value)} placeholder="Descrição (opcional)" rows={3} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={() => setNovoCardAberto(null)} style={btnGhost}>Cancelar</button>
            <button type="button" onClick={criarCardSubmit} className="cta-btn" style={{ fontSize: 12.5, padding: "8px 16px" }}>Adicionar</button>
          </div>
        </div>
      </Balao>
    </section>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "var(--mk-surface)",
  border: ".5px solid var(--mk-border)",
  borderRadius: 8,
  color: "var(--mk-text)",
  fontSize: 13,
  outline: "none",
};

const btnGhost: React.CSSProperties = {
  padding: "8px 14px",
  background: "transparent",
  border: ".5px solid var(--mk-border)",
  borderRadius: 8,
  color: "var(--mk-text-muted)",
  fontSize: 12.5,
  cursor: "pointer",
};
