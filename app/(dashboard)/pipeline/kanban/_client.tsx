"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Balao } from "@/components/ui/Balao";
import { criarQuadro, deletarQuadro, criarColuna, deletarColuna, editarColuna, salvarOrdemColunas, salvarNotaColuna, criarCard, deletarCard, moverCard, salvarRegrasEtiqueta, adicionarContatoNaColuna, importarContatosPorEtiqueta } from "./_actions";

interface Quadro { id: string; nome: string; descricao: string | null; cor: string }
interface Coluna { id: string; nome: string; cor: string; ordem: number; nota: string | null }
interface Card { id: string; coluna_id: string; titulo: string; descricao: string | null; ordem: number; valor: number | null; numero: number | null; numero_global: number | null; contato_id: string | null; foto_url: string | null; fechado: boolean; resultado: "ganho" | "perdido" | null; responsavel_id: string | null; criado_em: string | null }
interface Contato { id: string; nome: string; whatsapp: string | null; foto_url: string | null }
interface Usuario { id: string; nome: string }

interface Etiqueta { id: string; nome: string; cor: string }

interface Props {
  quadros: Quadro[];
  quadroAtivoId: string | null;
  colunas: Coluna[];
  cards: Card[];
  etiquetas: Etiqueta[];
  regrasPorColuna: Record<string, string[]>;
  contatos: Contato[];
  usuarios: Usuario[];
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PALETA = ["#00E19A", "#5cd0ff", "#9B7DBF", "#FFB547", "#FF5C72", "#6B8E4E"];

export function KanbanClient({ quadros, quadroAtivoId, colunas, cards, etiquetas, regrasPorColuna, contatos, usuarios }: Props) {
  const router = useRouter();
  const [novoQuadroAberto, setNovoQuadroAberto] = useState(false);
  const [novoQuadroNome, setNovoQuadroNome] = useState("");
  const [novoQuadroDesc, setNovoQuadroDesc] = useState("");
  const [novoQuadroCor, setNovoQuadroCor] = useState(PALETA[0]);
  const [novaColunaAberto, setNovaColunaAberto] = useState(false);
  const [novaColunaNome, setNovaColunaNome] = useState("");
  const [novaColunaCor, setNovaColunaCor] = useState(PALETA[1]);
  const [notaColAberto, setNotaColAberto] = useState<{ id: string; nome: string } | null>(null);
  const [notaTexto, setNotaTexto] = useState("");
  const [notaSalvando, setNotaSalvando] = useState(false);
  const [regrasAberto, setRegrasAberto] = useState<{ colunaId: string; colunaNome: string } | null>(null);
  const [regrasSelecionadas, setRegrasSelecionadas] = useState<Set<string>>(new Set());
  const [salvandoRegras, setSalvandoRegras] = useState(false);
  const [addAberto, setAddAberto] = useState<{ colunaId: string; colunaNome: string; modo: "contato" | "etiqueta" } | null>(null);
  const [addBusca, setAddBusca] = useState("");
  const [addEtiquetaSel, setAddEtiquetaSel] = useState<string>("");
  const [addExecutando, setAddExecutando] = useState(false);
  const [editColAberto, setEditColAberto] = useState<{ id: string; nome: string; cor: string } | null>(null);
  const [editColNome, setEditColNome] = useState("");
  const [editColCor, setEditColCor] = useState(PALETA[1]);
  const [, startTransition] = useTransition();

  // Drag-and-drop nativo
  const [arrastando, setArrastando] = useState<string | null>(null);

  // Modo reordenar colunas
  const [ordemLocal, setOrdemLocal] = useState<string[] | null>(null);
  const [arrastandoColuna, setArrastandoColuna] = useState<string | null>(null);
  const [salvandoOrdem, setSalvandoOrdem] = useState(false);
  const modoReordenar = ordemLocal !== null;
  const colunasOrdenadas: Coluna[] = modoReordenar
    ? (ordemLocal!.map((id) => colunas.find((c) => c.id === id)).filter(Boolean) as Coluna[])
    : colunas;

  function iniciarReordenar() {
    setOrdemLocal(colunas.map((c) => c.id));
  }
  function cancelarReordenar() {
    setOrdemLocal(null);
    setArrastandoColuna(null);
  }
  async function salvarReordenar() {
    if (!ordemLocal) return;
    setSalvandoOrdem(true);
    const r = await salvarOrdemColunas(ordemLocal);
    setSalvandoOrdem(false);
    if (r.ok) {
      setOrdemLocal(null);
      setArrastandoColuna(null);
      router.refresh();
    } else alert(r.msg);
  }
  function onDragOverColuna(e: React.DragEvent, sobreId: string) {
    if (!modoReordenar || !arrastandoColuna || arrastandoColuna === sobreId) return;
    e.preventDefault();
    setOrdemLocal((prev) => {
      if (!prev) return prev;
      const a = prev.indexOf(arrastandoColuna);
      const b = prev.indexOf(sobreId);
      if (a < 0 || b < 0) return prev;
      const nv = [...prev];
      nv.splice(a, 1);
      nv.splice(b, 0, arrastandoColuna);
      return nv;
    });
  }

  function trocarQuadro(id: string) {
    router.push(`/pipeline/kanban?quadro=${id}`);
  }

  async function criarQuadroSubmit() {
    if (!novoQuadroNome.trim()) return;
    const r = await criarQuadro(novoQuadroNome, novoQuadroDesc, novoQuadroCor);
    if (r.ok && r.id) {
      setNovoQuadroAberto(false);
      setNovoQuadroNome("");
      setNovoQuadroDesc("");
      router.push(`/pipeline/kanban?quadro=${r.id}`);
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

  async function salvarNotaSubmit() {
    if (!notaColAberto) return;
    setNotaSalvando(true);
    const r = await salvarNotaColuna(notaColAberto.id, notaTexto);
    setNotaSalvando(false);
    if (r.ok) {
      setNotaColAberto(null);
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

  // ===== KPIs e filtros (Fase G) =====
  const totalOportunidades = cards.length;
  const totalValor = cards.reduce((s, c) => s + (Number(c.valor) || 0), 0);
  const totalAbertos = cards.filter((c) => !c.fechado).length;
  const totalFechados = cards.filter((c) => c.fechado).length;

  const [buscaCard, setBuscaCard] = useState("");
  const [valorMin, setValorMin] = useState("");
  const [valorMax, setValorMax] = useState("");
  const [filtrosAberto, setFiltrosAberto] = useState(false);
  const [filtroEtapaId, setFiltroEtapaId] = useState<string>("");
  const [filtroEtiquetaId, setFiltroEtiquetaId] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "aberto" | "ganho" | "perdido">("todos");
  const [filtroResponsavelId, setFiltroResponsavelId] = useState<string>("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [novaOpAberto, setNovaOpAberto] = useState(false);
  const [novaOpColunaId, setNovaOpColunaId] = useState("");
  const [novaOpModo, setNovaOpModo] = useState<"contato" | "manual">("contato");
  const [novaOpBusca, setNovaOpBusca] = useState("");
  const [novaOpTitulo, setNovaOpTitulo] = useState("");
  const [novaOpExecutando, setNovaOpExecutando] = useState(false);

  function passaFiltros(card: Card): boolean {
    const q = buscaCard.trim().toLowerCase();
    if (q) {
      const tituloHit = card.titulo.toLowerCase().includes(q);
      const contatoHit = card.contato_id ? (contatos.find((c) => c.id === card.contato_id)?.nome.toLowerCase().includes(q) ?? false) : false;
      if (!tituloHit && !contatoHit) return false;
    }
    if (filtroEtapaId && card.coluna_id !== filtroEtapaId) return false;
    if (filtroResponsavelId && card.responsavel_id !== filtroResponsavelId) return false;
    if (filtroStatus === "aberto" && card.fechado) return false;
    if (filtroStatus === "ganho" && card.resultado !== "ganho") return false;
    if (filtroStatus === "perdido" && card.resultado !== "perdido") return false;
    if (dataInicio && card.criado_em && card.criado_em.slice(0, 10) < dataInicio) return false;
    if (dataFim && card.criado_em && card.criado_em.slice(0, 10) > dataFim) return false;
    if (valorMin) {
      const v = Number(valorMin.replace(",", "."));
      if (!isNaN(v) && (card.valor ?? 0) < v) return false;
    }
    if (valorMax) {
      const v = Number(valorMax.replace(",", "."));
      if (!isNaN(v) && (card.valor ?? 0) > v) return false;
    }
    return true;
  }

  function limparFiltros() {
    setBuscaCard("");
    setValorMin("");
    setValorMax("");
    setFiltroEtapaId("");
    setFiltroEtiquetaId("");
    setFiltroStatus("todos");
    setFiltroResponsavelId("");
    setDataInicio("");
    setDataFim("");
  }
  const algumFiltro = !!(buscaCard || valorMin || valorMax || filtroEtapaId || filtroEtiquetaId || filtroResponsavelId || dataInicio || dataFim || (filtroStatus !== "todos"));

  function exportarCSV() {
    const linhas = [["ID", "Título", "Contato", "Etapa", "Valor", "Status", "Criado em"]];
    for (const col of colunas) {
      for (const c of cards.filter((x) => x.coluna_id === col.id).filter(passaFiltros)) {
        const contatoNome = c.contato_id ? (contatos.find((ct) => ct.id === c.contato_id)?.nome ?? "") : "";
        const status = c.resultado === "ganho" ? "Ganho" : c.resultado === "perdido" ? "Perdido" : c.fechado ? "Fechado" : "Aberto";
        linhas.push([
          String(c.numero_global ?? ""),
          c.titulo,
          contatoNome,
          col.nome,
          c.valor != null ? String(c.valor).replace(".", ",") : "",
          status,
          c.criado_em ? new Date(c.criado_em).toLocaleDateString("pt-BR") : "",
        ]);
      }
    }
    const csv = linhas.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oportunidades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* KPIs topo */}
      {quadroAtivoId && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, flex: 1 }}>
            <KpiKanban label="Oportunidades" valor={totalOportunidades.toString()} cor="#5cd0ff" icone="ti-users" />
            <KpiKanban label="Abertos" valor={totalAbertos.toString()} cor="#FFB547" icone="ti-target" />
            <KpiKanban label="Fechados" valor={totalFechados.toString()} cor="#9B7DBF" icone="ti-circle-check" />
            <KpiKanban label="Valor total" valor={BRL.format(totalValor)} cor="#00E19A" icone="ti-currency-dollar" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={exportarCSV} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "8px 14px", background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "var(--mk-text)", cursor: "pointer", whiteSpace: "nowrap" }}>
              <i className="ti ti-download" /> Exportar CSV
            </button>
            <button type="button" onClick={() => setNovaOpAberto(true)} className="cta-btn" style={{ fontSize: 12, padding: "8px 14px", whiteSpace: "nowrap" }}>
              <i className="ti ti-plus" style={{ marginRight: 4 }} /> Nova Oportunidade
            </button>
          </div>
        </div>
      )}

      {/* Busca + Filtros toggle */}
      {quadroAtivoId && (
        <div style={{ background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 10, padding: 10, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <i className="ti ti-search" style={{ color: "var(--mk-text-muted)", fontSize: 14, marginLeft: 4 }} />
            <input
              type="text"
              value={buscaCard}
              onChange={(e) => setBuscaCard(e.target.value)}
              placeholder="Buscar por nome, contato..."
              style={{ flex: 1, padding: "7px 8px", background: "transparent", border: 0, color: "var(--mk-text)", fontSize: 12.5, outline: "none" }}
            />
            <button
              type="button"
              onClick={() => setFiltrosAberto((s) => !s)}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, padding: "6px 12px", background: filtrosAberto ? "rgba(0,225,154,0.15)" : "transparent", border: ".5px solid var(--mk-border)", borderRadius: 8, color: filtrosAberto ? "#00E19A" : "var(--mk-text)", cursor: "pointer" }}
            >
              Filtros <i className={`ti ${filtrosAberto ? "ti-chevron-up" : "ti-chevron-down"}`} />
            </button>
          </div>
          {filtrosAberto && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: ".5px solid var(--mk-border)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <FltSel label="Etapa" value={filtroEtapaId} onChange={setFiltroEtapaId} options={[{ value: "", label: "Todas" }, ...colunas.map((c) => ({ value: c.id, label: c.nome }))]} />
              <FltSel label="Etiqueta" value={filtroEtiquetaId} onChange={setFiltroEtiquetaId} options={[{ value: "", label: "Todas" }, ...etiquetas.map((e) => ({ value: e.id, label: e.nome }))]} />
              <FltSel label="Responsável" value={filtroResponsavelId} onChange={setFiltroResponsavelId} options={[{ value: "", label: "Todos" }, ...usuarios.map((u) => ({ value: u.id, label: u.nome }))]} />
              <FltSel label="Status" value={filtroStatus} onChange={(v) => setFiltroStatus(v as typeof filtroStatus)} options={[{ value: "todos", label: "Todos" }, { value: "aberto", label: "Aberto" }, { value: "ganho", label: "Ganho" }, { value: "perdido", label: "Perdido" }]} />
              <div>
                <label style={lbl}>Valor mínimo</label>
                <input type="text" inputMode="decimal" value={valorMin} onChange={(e) => setValorMin(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="0,00" style={inpSm} />
              </div>
              <div>
                <label style={lbl}>Valor máximo</label>
                <input type="text" inputMode="decimal" value={valorMax} onChange={(e) => setValorMax(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="0,00" style={inpSm} />
              </div>
              <div>
                <label style={lbl}>Data início</label>
                <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={inpSm} />
              </div>
              <div>
                <label style={lbl}>Data fim</label>
                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} style={inpSm} />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                {algumFiltro && (
                  <button type="button" onClick={limparFiltros} style={{ flex: 1, fontSize: 11.5, padding: "8px 10px", background: "transparent", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "var(--mk-text-muted)", cursor: "pointer" }}>
                    <i className="ti ti-x" style={{ marginRight: 3 }} /> Limpar filtros
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {quadroAtivoId && colunas.length > 1 && !modoReordenar && (
            <button
              type="button"
              onClick={iniciarReordenar}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "8px 14px", background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "var(--mk-text)", cursor: "pointer" }}
              title="Reordenar colunas arrastando"
            >
              <i className="ti ti-arrows-move" />
              Mover colunas
            </button>
          )}
          {modoReordenar && (
            <div style={{ display: "inline-flex", gap: 6, padding: "4px 6px", background: "rgba(255,181,71,0.12)", border: "1px solid rgba(255,181,71,0.4)", borderRadius: 10, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#FFB547", padding: "0 6px" }}>Arraste as colunas</span>
              <button
                type="button"
                onClick={cancelarReordenar}
                title="Cancelar (voltar pra ordem original)"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "#FF5C72", cursor: "pointer" }}
              >
                <i className="ti ti-x" style={{ fontSize: 16 }} />
              </button>
              <button
                type="button"
                onClick={salvarReordenar}
                disabled={salvandoOrdem}
                title="Salvar nova ordem"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, background: "#00E19A", border: 0, borderRadius: 8, color: "#04140d", cursor: salvandoOrdem ? "wait" : "pointer", opacity: salvandoOrdem ? 0.6 : 1 }}
              >
                <i className="ti ti-check" style={{ fontSize: 16 }} />
              </button>
            </div>
          )}
          <button type="button" onClick={() => setNovoQuadroAberto(true)} className="cta-btn" style={{ fontSize: 12, padding: "8px 14px" }}>
            <i className="ti ti-plus" style={{ marginRight: 4 }} />
            Novo quadro
          </button>
        </div>
      </div>

      {/* Tabs dos quadros */}
      {quadros.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          {quadros.map((q) => (
            <div
              key={q.id}
              style={{
                display: "inline-flex",
                alignItems: "stretch",
                background: q.id === quadroAtivoId ? `${q.cor}22` : "var(--mk-surface)",
                border: q.id === quadroAtivoId ? `1px solid ${q.cor}` : ".5px solid var(--mk-border)",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={() => trocarQuadro(q.id)}
                style={{
                  padding: "8px 12px",
                  background: "transparent",
                  border: 0,
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
              {q.id === quadroAtivoId && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`Deletar quadro "${q.nome}" inteiro? Todas as colunas e cards vão junto. Essa ação não pode ser desfeita.`)) return;
                    await deletarQuadro(q.id);
                    router.refresh();
                    router.push("/pipeline/kanban");
                  }}
                  title="Deletar quadro"
                  style={{
                    background: "transparent",
                    border: 0,
                    borderLeft: `1px solid ${q.cor}55`,
                    color: q.cor,
                    cursor: "pointer",
                    padding: "0 10px",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <i className="ti ti-trash" style={{ fontSize: 13 }} />
                </button>
              )}
            </div>
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
          {colunasOrdenadas.map((col) => {
            const cardsDaCol = cards.filter((c) => c.coluna_id === col.id).filter(passaFiltros).sort((a, b) => a.ordem - b.ordem);
            return (
              <div
                key={col.id}
                draggable={modoReordenar}
                onDragStart={() => { if (modoReordenar) setArrastandoColuna(col.id); }}
                onDragEnd={() => setArrastandoColuna(null)}
                onDragOver={(e) => {
                  if (modoReordenar) { onDragOverColuna(e, col.id); return; }
                  e.preventDefault();
                }}
                onDrop={() => { if (!modoReordenar) dropCard(col.id); }}
                style={{
                  minWidth: 280,
                  maxWidth: 280,
                  background: "var(--mk-surface)",
                  border: modoReordenar ? "1.5px dashed #FFB547" : ".5px solid var(--mk-border)",
                  borderTop: `3px solid ${col.cor}`,
                  borderRadius: 10,
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  cursor: modoReordenar ? "grab" : "default",
                  opacity: arrastandoColuna === col.id ? 0.4 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {modoReordenar && <i className="ti ti-grip-vertical" style={{ fontSize: 13, color: "#FFB547" }} />}
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.cor }} />
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{col.nome}</span>
                    <span style={{ fontSize: 10, color: "var(--mk-text-muted)", padding: "1px 6px", background: "var(--mk-surface-2)", borderRadius: 999 }}>{cardsDaCol.length}</span>
                  </div>
                  {!modoReordenar && (
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
                        onClick={() => { setNotaColAberto({ id: col.id, nome: col.nome }); setNotaTexto(col.nota || ""); }}
                        title={col.nota ? "Nota da coluna (preenchida)" : "Nota da coluna"}
                        style={{ background: "transparent", border: 0, color: col.nota ? "#FFB547" : "var(--mk-text-muted)", cursor: "pointer", fontSize: 12, padding: 2 }}
                      >
                        <i className="ti ti-note" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditColAberto({ id: col.id, nome: col.nome, cor: col.cor });
                          setEditColNome(col.nome);
                          setEditColCor(col.cor);
                        }}
                        title="Editar coluna"
                        style={{ background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", fontSize: 12, padding: 2 }}
                      >
                        <i className="ti ti-pencil" />
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
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 60 }}>
                  {cardsDaCol.map((card) => (
                    <div
                      key={card.id}
                      draggable={!modoReordenar}
                      onDragStart={(e) => { if (modoReordenar) { e.preventDefault(); return; } setArrastando(card.id); }}
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
                        <div style={{ display: "flex", gap: 8, flex: 1, minWidth: 0, alignItems: "flex-start" }}>
                          {card.contato_id && (
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <i className="ti ti-user" style={{ fontSize: 14, color: "var(--mk-text-muted)" }} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {card.numero_global != null && (
                              <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--mk-text-muted)", letterSpacing: 0.4 }}>
                                #{String(card.numero_global).padStart(3, "0")}
                              </div>
                            )}
                            <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis" }}>{card.titulo}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm("Remover card?")) return;
                            await deletarCard(card.id);
                            router.refresh();
                          }}
                          style={{ background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", padding: 0, fontSize: 11 }}
                          title="Remover"
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
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => { setAddAberto({ colunaId: col.id, colunaNome: col.nome, modo: "contato" }); setAddBusca(""); }}
                    style={{ background: "transparent", border: ".5px dashed var(--mk-border)", borderRadius: 8, color: "var(--mk-text-muted)", padding: "7px 10px", fontSize: 11.5, cursor: "pointer", textAlign: "left" }}
                  >
                    <i className="ti ti-user-plus" style={{ marginRight: 6 }} /> Adicionar contato
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddAberto({ colunaId: col.id, colunaNome: col.nome, modo: "etiqueta" }); setAddEtiquetaSel(""); }}
                    style={{ background: "transparent", border: ".5px dashed var(--mk-border)", borderRadius: 8, color: "var(--mk-text-muted)", padding: "7px 10px", fontSize: 11.5, cursor: "pointer", textAlign: "left" }}
                  >
                    <i className="ti ti-tag" style={{ marginRight: 6 }} /> Importar por etiqueta
                  </button>
                </div>
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

      {/* Balão Editar Coluna */}
      <Balao open={!!editColAberto} onClose={() => setEditColAberto(null)} titulo="Editar coluna" icone="ti-pencil" largura={400}>
        <div style={{ padding: "8px 4px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="text" value={editColNome} onChange={(e) => setEditColNome(e.target.value)} placeholder="Nome da coluna" style={inp} autoFocus />
          <div style={{ display: "flex", gap: 6 }}>
            {PALETA.map((c) => (
              <button key={c} type="button" onClick={() => setEditColCor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: editColCor === c ? "2px solid var(--mk-text)" : "1px solid var(--mk-border)", cursor: "pointer" }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={() => setEditColAberto(null)} style={btnGhost}>Cancelar</button>
            <button
              type="button"
              onClick={async () => {
                if (!editColAberto) return;
                const r = await editarColuna(editColAberto.id, editColNome, editColCor);
                if (r.ok) {
                  setEditColAberto(null);
                  router.refresh();
                } else alert(r.msg);
              }}
              className="cta-btn"
              style={{ fontSize: 12.5, padding: "8px 16px" }}
            >
              Salvar
            </button>
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

      {/* Balão Adicionar contato / Importar por etiqueta */}
      <Balao
        open={!!addAberto}
        onClose={() => setAddAberto(null)}
        titulo={addAberto?.modo === "etiqueta" ? `Importar por etiqueta → "${addAberto?.colunaNome || ""}"` : `Adicionar contato → "${addAberto?.colunaNome || ""}"`}
        icone={addAberto?.modo === "etiqueta" ? "ti-tag" : "ti-user-plus"}
        largura={520}
      >
        <div style={{ padding: "8px 4px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
          {addAberto?.modo === "contato" ? (
            <>
              <input
                type="text"
                value={addBusca}
                onChange={(e) => setAddBusca(e.target.value)}
                placeholder="Buscar contato por nome ou WhatsApp..."
                style={inp}
                autoFocus
              />
              <div style={{ maxHeight: 360, overflowY: "auto", border: ".5px solid var(--mk-border)", borderRadius: 8, background: "var(--mk-surface)" }}>
                {contatos
                  .filter((c) => {
                    const q = addBusca.toLowerCase().trim();
                    if (!q) return true;
                    return c.nome.toLowerCase().includes(q) || (c.whatsapp || "").includes(q);
                  })
                  .slice(0, 80)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={addExecutando}
                      onClick={async () => {
                        if (!addAberto) return;
                        setAddExecutando(true);
                        const r = await adicionarContatoNaColuna(addAberto.colunaId, c.id);
                        setAddExecutando(false);
                        if (r.ok) {
                          setAddAberto(null);
                          router.refresh();
                          if (r.jaExistia) alert("Esse contato já tinha card nesse quadro.");
                        } else alert(r.msg);
                      }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "transparent", border: 0, borderBottom: ".5px solid var(--mk-border)", color: "var(--mk-text)", fontSize: 12.5, cursor: "pointer", textAlign: "left" }}
                    >
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--mk-surface-2)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="ti ti-user" style={{ fontSize: 13, color: "var(--mk-text-muted)" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome || "Sem nome"}</div>
                        {c.whatsapp && <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>{c.whatsapp}</div>}
                      </div>
                      <i className="ti ti-plus" style={{ color: "var(--mk-accent)" }} />
                    </button>
                  ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--mk-text-muted)", textAlign: "center" }}>
                Mostrando até 80 contatos. Use a busca pra filtrar.
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: 10, background: "rgba(0,225,154,0.06)", border: ".5px solid rgba(0,225,154,0.25)", borderRadius: 8, fontSize: 12, color: "var(--mk-text)", lineHeight: 1.5 }}>
                Escolhe a etiqueta. Todos os contatos que tiverem ela vão virar cards nesta coluna. Quem já tiver card no quadro é pulado.
              </div>
              <select value={addEtiquetaSel} onChange={(e) => setAddEtiquetaSel(e.target.value)} style={inp}>
                <option value="">— Escolha a etiqueta —</option>
                {etiquetas.map((etq) => (
                  <option key={etq.id} value={etq.id}>{etq.nome}</option>
                ))}
              </select>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={() => setAddAberto(null)} disabled={addExecutando} style={btnGhost}>Cancelar</button>
                <button
                  type="button"
                  disabled={addExecutando || !addEtiquetaSel}
                  onClick={async () => {
                    if (!addAberto || !addEtiquetaSel) return;
                    setAddExecutando(true);
                    const r = await importarContatosPorEtiqueta(addAberto.colunaId, addEtiquetaSel);
                    setAddExecutando(false);
                    if (r.ok) {
                      alert(`Importação concluída: ${r.criados} criados${r.pulados > 0 ? `, ${r.pulados} já existiam (pulados)` : ""}.`);
                      setAddAberto(null);
                      router.refresh();
                    } else alert(r.msg);
                  }}
                  className="cta-btn"
                  style={{ fontSize: 12.5, padding: "8px 16px" }}
                >
                  {addExecutando ? "Importando..." : "Importar agora"}
                </button>
              </div>
            </>
          )}
        </div>
      </Balao>

      {/* Balão Nota da Coluna */}
      <Balao open={!!notaColAberto} onClose={() => setNotaColAberto(null)} titulo={`Nota · "${notaColAberto?.nome || ""}"`} icone="ti-note" largura={500}>
        <div style={{ padding: "8px 4px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)" }}>Descrição ou informativo dessa coluna. Aparece pra todos do time.</div>
          <textarea
            value={notaTexto}
            onChange={(e) => setNotaTexto(e.target.value)}
            placeholder="Ex: nesta coluna ficam leads que pediram orçamento mas ainda não enviei proposta."
            rows={6}
            style={{ ...inp, resize: "vertical", fontFamily: "inherit" }}
            autoFocus
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            {notaTexto.trim() && (
              <button
                type="button"
                onClick={() => setNotaTexto("")}
                style={{ background: "transparent", border: 0, color: "#FF5C72", cursor: "pointer", fontSize: 11.5, padding: 4 }}
              >
                <i className="ti ti-trash" style={{ marginRight: 4 }} /> Limpar
              </button>
            )}
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button type="button" onClick={() => setNotaColAberto(null)} style={btnGhost}>Cancelar</button>
              <button type="button" onClick={salvarNotaSubmit} disabled={notaSalvando} className="cta-btn" style={{ fontSize: 12.5, padding: "8px 16px", opacity: notaSalvando ? 0.6 : 1 }}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      </Balao>

      {/* Balão Nova Oportunidade */}
      <Balao
        open={novaOpAberto}
        onClose={() => { setNovaOpAberto(false); setNovaOpBusca(""); setNovaOpTitulo(""); }}
        titulo="Nova Oportunidade"
        icone="ti-plus"
        largura={460}
      >
        <div style={{ padding: "8px 4px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={lbl}>Etapa</label>
            <select value={novaOpColunaId} onChange={(e) => setNovaOpColunaId(e.target.value)} style={inp}>
              <option value="">Selecione...</option>
              {colunas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", gap: 6, borderBottom: ".5px solid var(--mk-border)" }}>
            <button type="button" onClick={() => setNovaOpModo("contato")} style={{ flex: 1, fontSize: 12, padding: "8px 10px", background: novaOpModo === "contato" ? "rgba(0,225,154,0.15)" : "transparent", border: 0, color: novaOpModo === "contato" ? "#00E19A" : "var(--mk-text-muted)", fontWeight: novaOpModo === "contato" ? 700 : 500, cursor: "pointer" }}>
              <i className="ti ti-user" style={{ marginRight: 4 }} /> Contato existente
            </button>
            <button type="button" onClick={() => setNovaOpModo("manual")} style={{ flex: 1, fontSize: 12, padding: "8px 10px", background: novaOpModo === "manual" ? "rgba(0,225,154,0.15)" : "transparent", border: 0, color: novaOpModo === "manual" ? "#00E19A" : "var(--mk-text-muted)", fontWeight: novaOpModo === "manual" ? 700 : 500, cursor: "pointer" }}>
              <i className="ti ti-pencil" style={{ marginRight: 4 }} /> Manual
            </button>
          </div>

          {novaOpModo === "contato" ? (
            <>
              <input type="text" value={novaOpBusca} onChange={(e) => setNovaOpBusca(e.target.value)} placeholder="Buscar contato..." style={inp} autoFocus />
              <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {(() => {
                  const q = novaOpBusca.toLowerCase().trim();
                  const lista = q ? contatos.filter((c) => c.nome.toLowerCase().includes(q) || (c.whatsapp || "").includes(q)) : contatos.slice(0, 30);
                  if (lista.length === 0) return <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)", textAlign: "center", padding: 16 }}>Nenhum contato encontrado.</div>;
                  return lista.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={novaOpExecutando || !novaOpColunaId}
                      onClick={async () => {
                        if (!novaOpColunaId) return;
                        setNovaOpExecutando(true);
                        const r = await adicionarContatoNaColuna(novaOpColunaId, c.id);
                        setNovaOpExecutando(false);
                        if (r.ok) {
                          setNovaOpAberto(false);
                          setNovaOpBusca("");
                          router.refresh();
                        } else alert(r.msg);
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--mk-surface-2)", border: ".5px solid var(--mk-border)", borderRadius: 8, cursor: novaOpColunaId ? "pointer" : "not-allowed", textAlign: "left", color: "var(--mk-text)", opacity: novaOpColunaId ? 1 : 0.5 }}
                    >
                      <i className="ti ti-user" style={{ color: "var(--mk-text-muted)" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.nome}</div>
                        {c.whatsapp && <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>{c.whatsapp}</div>}
                      </div>
                    </button>
                  ));
                })()}
              </div>
              {!novaOpColunaId && <div style={{ fontSize: 11, color: "#FFB547" }}>Escolhe a etapa primeiro.</div>}
            </>
          ) : (
            <>
              <div>
                <label style={lbl}>Título</label>
                <input type="text" value={novaOpTitulo} onChange={(e) => setNovaOpTitulo(e.target.value)} placeholder="Ex: Lead sem contato cadastrado" style={inp} autoFocus />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={() => setNovaOpAberto(false)} style={btnGhost}>Cancelar</button>
                <button
                  type="button"
                  disabled={novaOpExecutando || !novaOpColunaId || !novaOpTitulo.trim()}
                  onClick={async () => {
                    if (!novaOpColunaId || !novaOpTitulo.trim()) return;
                    setNovaOpExecutando(true);
                    const r = await criarCard(novaOpColunaId, novaOpTitulo, "");
                    setNovaOpExecutando(false);
                    if (r.ok) {
                      setNovaOpAberto(false);
                      setNovaOpTitulo("");
                      router.refresh();
                    } else alert(r.msg);
                  }}
                  className="cta-btn"
                  style={{ fontSize: 12.5, padding: "8px 16px", opacity: (!novaOpColunaId || !novaOpTitulo.trim()) ? 0.5 : 1 }}
                >
                  Criar
                </button>
              </div>
            </>
          )}
        </div>
      </Balao>
    </div>
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

function FltSel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inpSm}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "var(--mk-text-muted)", marginBottom: 4, letterSpacing: 0.3, textTransform: "uppercase" };
const inpSm: React.CSSProperties = { width: "100%", padding: "7px 10px", background: "var(--mk-surface-2)", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "var(--mk-text)", fontSize: 12.5, outline: "none" };

function KpiKanban({ label, valor, cor, icone }: { label: string; valor: string; cor: string; icone: string }) {
  return (
    <div style={{ background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--mk-text-muted)", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
        <i className={`ti ${icone}`} style={{ color: cor, fontSize: 14 }} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: "var(--mk-text)" }}>{valor}</div>
    </div>
  );
}
