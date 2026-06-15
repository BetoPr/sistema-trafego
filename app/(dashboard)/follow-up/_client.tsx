"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Balao } from "@/components/ui/Balao";
import { salvarSequencia, toggleSequencia, excluirSequencia, cancelarInscricao, type SequenciaInput, type MsgEtapaInput } from "./_actions";

type Tipo = "texto" | "imagem" | "documento" | "audio" | "video";
interface Msg { tipo: Tipo; conteudo?: string; midia_url?: string; midia_path?: string; midia_mime?: string; midia_filename?: string; variacoes?: string[] }
interface Etapa { id?: string; ordem: number; apos_horas: number; mensagens: Msg[] }
interface Sequencia { id: string; nome: string; descricao: string | null; ativo: boolean; etiqueta_gatilho_id: string | null; delay_min_seg: number; delay_max_seg: number; janela_inicio: string; janela_fim: string; teto_dia: number; etapas: Etapa[] }
interface Etiqueta { id: string; nome: string; cor: string }
interface FilaItem { id: string; status: string; etapa_atual: number; proximo_envio_em: string | null; criado_em: string; sequencia: { nome: string } | { nome: string }[] | null; contato: { nome: string | null; whatsapp: string | null } | { nome: string | null; whatsapp: string | null }[] | null }

const TIPOS: { v: Tipo; label: string; icon: string }[] = [
  { v: "texto", label: "Texto", icon: "ti-message" },
  { v: "imagem", label: "Imagem", icon: "ti-photo" },
  { v: "documento", label: "Documento", icon: "ti-file" },
  { v: "audio", label: "Áudio", icon: "ti-microphone" },
  { v: "video", label: "Vídeo", icon: "ti-video" },
];

function uno<T>(v: T | T[] | null): T | null { return Array.isArray(v) ? v[0] ?? null : v; }
const hhmm = (t: string) => (t || "").slice(0, 5);

export function FollowUpClient({ sequencias, fila, etiquetas }: { sequencias: Sequencia[]; fila: FilaItem[]; etiquetas: Etiqueta[] }) {
  const [tab, setTab] = useState<"seq" | "fila" | "ia">("seq");
  const [editando, setEditando] = useState<SequenciaInput | null>(null);

  return (
    <>
      <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--mk-surface)", borderRadius: 10, border: "0.5px solid var(--mk-border)", width: "fit-content", marginBottom: 16, flexWrap: "wrap" }}>
        <TabBtn on={tab === "seq"} onClick={() => setTab("seq")} icon="ti-timeline-event">Sequências ({sequencias.length})</TabBtn>
        <TabBtn on={tab === "fila"} onClick={() => setTab("fila")} icon="ti-users">Fila ({fila.length})</TabBtn>
        <TabBtn on={tab === "ia"} onClick={() => setTab("ia")} icon="ti-sparkles">Follow-up IA</TabBtn>
      </div>

      {tab === "seq" && <Sequencias lista={sequencias} onNova={() => setEditando(seqVazia())} onEditar={(s) => setEditando(paraInput(s))} />}
      {tab === "fila" && <Fila itens={fila} />}
      {tab === "ia" && <FollowUpIA />}

      {editando && <Editor inicial={editando} etiquetas={etiquetas} onClose={() => setEditando(null)} />}
    </>
  );
}

// ===== Follow-up com IA (3C) =====
interface Cand { ticketId: string; numero: number; nome: string; whatsapp: string | null; ultima_mensagem_em: string | null; enviar: boolean; motivo: string; resumo: string; mensagem: string; _sent?: boolean; _busy?: boolean; _pendente?: boolean; _analisado?: boolean }

function FollowUpIA() {
  const [horas, setHoras] = useState(12);
  const [limite, setLimite] = useState(40);
  const [delayMin, setDelayMin] = useState(30);
  const [delayMax, setDelayMax] = useState(60);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [cands, setCands] = useState<Cand[] | null>(null);
  const [enviandoTodos, setEnviandoTodos] = useState(false);
  const [analisando, setAnalisando] = useState<{ feitos: number; total: number } | null>(null);

  function patch(id: string, p: Partial<Cand>) { setCands((cs) => (cs || []).map((c) => (c.ticketId === id ? { ...c, ...p } : c))); }
  function remover(id: string) { setCands((cs) => (cs || []).filter((c) => c.ticketId !== id)); }

  // Passo 1: só busca a lista de conversas paradas (rápido, sem IA) → mostra a quantidade
  async function buscar() {
    setLoading(true); setErro(""); setCands(null); setAnalisando(null);
    try {
      const r = await fetch("/api/follow-up/ia/verificar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ horas, limite }) });
      const j = await r.json();
      if (!j.ok) { setErro(j.error || "Falha"); return; }
      const lista: Cand[] = (j.candidatos || []).map((c: Cand) => ({ ...c, enviar: false, motivo: "", resumo: "", mensagem: "", _analisado: false }));
      setCands(lista);
    } catch { setErro("Falha na busca"); } finally { setLoading(false); }
  }

  // Análise da IA de UM ticket (usada no "Analisar" individual e no lote)
  async function analisarUm(id: string) {
    patch(id, { _pendente: true });
    try {
      const r = await fetch("/api/follow-up/ia/regenerar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ticketId: id }) });
      const j = await r.json();
      if (j.ok) patch(id, { enviar: j.enviar, motivo: j.motivo, resumo: j.resumo, mensagem: j.mensagem, _pendente: false, _analisado: true });
      else patch(id, { _pendente: false, _analisado: true, enviar: false, motivo: j.error || "Falha na análise", resumo: "" });
    } catch { patch(id, { _pendente: false, _analisado: true, enviar: false, motivo: "Erro de rede" }); }
  }

  // Passo 2: analisa todos os não-analisados, 1 por vez (escala com a quantidade, sem estourar o TPM)
  async function analisarTodas() {
    const pend = (cands || []).filter((c) => !c._analisado);
    if (!pend.length) return;
    setAnalisando({ feitos: 0, total: pend.length });
    for (let i = 0; i < pend.length; i++) {
      await analisarUm(pend[i].ticketId);
      setAnalisando({ feitos: i + 1, total: pend.length });
      if (i < pend.length - 1) await new Promise((r) => setTimeout(r, 1200));
    }
    setAnalisando(null);
  }

  async function regenerar(id: string) {
    patch(id, { _busy: true });
    try {
      const r = await fetch("/api/follow-up/ia/regenerar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ticketId: id }) });
      const j = await r.json();
      if (j.ok) patch(id, { enviar: j.enviar, motivo: j.motivo, resumo: j.resumo, mensagem: j.mensagem });
    } finally { patch(id, { _busy: false }); }
  }

  async function enviar(id: string, mensagem: string): Promise<boolean> {
    patch(id, { _busy: true });
    try {
      const r = await fetch("/api/follow-up/ia/enviar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ticketId: id, mensagem }) });
      const j = await r.json();
      if (j.ok) { patch(id, { _sent: true, _busy: false }); return true; }
      patch(id, { _busy: false }); return false;
    } catch { patch(id, { _busy: false }); return false; }
  }

  async function enviarTodos() {
    const fila = (cands || []).filter((c) => c.enviar && !c._sent && c.mensagem.trim());
    if (!fila.length) return;
    setEnviandoTodos(true);
    const dmin = Math.max(0, delayMin), dmax = Math.max(dmin, delayMax);
    for (let i = 0; i < fila.length; i++) {
      await enviar(fila[i].ticketId, fila[i].mensagem);
      if (i < fila.length - 1) await new Promise((r) => setTimeout(r, (dmin + Math.random() * (dmax - dmin)) * 1000));
    }
    setEnviandoTodos(false);
  }

  const aprovados = (cands || []).filter((c) => c.enviar && !c._sent);
  const naoAnalisados = (cands || []).filter((c) => !c._analisado).length;

  return (
    <>
      <div className="mk-card" style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <Campo label="Conversas paradas há (horas)"><input type="number" min={1} value={horas} onChange={(e) => setHoras(+e.target.value)} style={{ ...inp, width: 110 }} /></Campo>
          <Campo label="Limite (quantas trazer)"><input type="number" min={1} max={200} value={limite} onChange={(e) => setLimite(Math.max(1, Math.min(200, +e.target.value)))} style={{ ...inp, width: 110 }} /></Campo>
          <Campo label="Delay min (s)"><input type="number" min={0} value={delayMin} onChange={(e) => setDelayMin(+e.target.value)} style={{ ...inp, width: 90 }} /></Campo>
          <Campo label="Delay máx (s)"><input type="number" min={0} value={delayMax} onChange={(e) => setDelayMax(+e.target.value)} style={{ ...inp, width: 90 }} /></Campo>
          <button className="cta-btn" onClick={buscar} disabled={loading || !!analisando}>
            <i className={`ti ${loading ? "ti-loader-2" : "ti-search"}`} /> {loading ? "Buscando…" : "Buscar conversas"}
          </button>
          {cands && cands.length > 0 && naoAnalisados > 0 && (
            <button className="cta-btn" onClick={analisarTodas} disabled={!!analisando} style={{ fontSize: 12, background: "#9B7DBF" }}>
              <i className={`ti ${analisando ? "ti-loader-2" : "ti-sparkles"}`} /> {analisando ? `Analisando ${analisando.feitos}/${analisando.total}…` : `Analisar ${naoAnalisados} com IA`}
            </button>
          )}
          {aprovados.length > 0 && (
            <button className="ghost-btn" onClick={enviarTodos} disabled={enviandoTodos} style={{ fontSize: 12 }}>
              <i className="ti ti-send" /> {enviandoTodos ? "Enviando…" : `Enviar ${aprovados.length} aprovado(s)`}
            </button>
          )}
        </div>
        {cands && (
          <div style={{ fontSize: 12, color: "var(--mk-text)", marginTop: 10, fontWeight: 600 }}>
            <i className="ti ti-message-2" style={{ color: "#9B7DBF" }} /> {cands.length} conversa(s) em aberto parada(s){naoAnalisados > 0 ? ` · ${naoAnalisados} aguardando análise` : " · todas analisadas"}
          </div>
        )}
        <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 8, display: "flex", gap: 6 }}>
          <i className="ti ti-info-circle" style={{ marginTop: 1 }} /> 1º <strong>Buscar</strong> mostra quantas conversas paradas existem. 2º <strong>Analisar</strong> a IA resume e sugere (1 por vez, usa sua chave Groq).
        </div>
        {erro && <div style={{ fontSize: 11.5, color: "#C97064", marginTop: 8 }}>{erro}</div>}
      </div>

      {cands === null ? null : cands.length === 0 ? (
        <Empty icon="ti-mood-smile" label="Nenhuma conversa parada no período. Tudo em dia!" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cands.map((c) => (
            <div key={c.ticketId} className="mk-card" style={{ padding: 14, opacity: c._sent ? 0.6 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <strong style={{ fontSize: 13, color: "var(--mk-text)" }}>{c.nome}</strong>
                <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>#{c.numero} · {c.whatsapp}</span>
                {c._pendente ? <span style={{ fontSize: 10, color: "var(--mk-text-muted)", marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}><i className="ti ti-loader-2" /> Analisando…</span>
                  : !c._analisado ? <span style={{ fontSize: 10, color: "var(--mk-text-muted)", marginLeft: "auto" }}>Não analisado</span>
                  : c.enviar ? <span style={{ fontSize: 10, color: "#10b981", border: "0.5px solid #10b98155", borderRadius: 6, padding: "2px 8px", marginLeft: "auto" }}><i className="ti ti-circle-check" /> Vale follow-up</span>
                  : <span style={{ fontSize: 10, color: "#94a3b8", border: "0.5px solid var(--mk-border)", borderRadius: 6, padding: "2px 8px", marginLeft: "auto" }}>Não recomendado</span>}
              </div>
              {c.resumo && <div style={{ fontSize: 11.5, color: "var(--mk-text-secondary)", marginBottom: 4 }}><i className="ti ti-file-text" style={{ color: "var(--mk-text-muted)" }} /> {c.resumo}</div>}
              {c.motivo && <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 8, fontStyle: "italic" }}>{c.motivo}</div>}

              {c._pendente ? (
                <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)", display: "flex", alignItems: "center", gap: 6 }}><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> Analisando a conversa…</div>
              ) : !c._analisado ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: "var(--mk-text-muted)", flex: 1 }}>Conversa parada — ainda não analisada pela IA.</span>
                  <button className="ghost-btn" style={{ fontSize: 11.5 }} onClick={() => analisarUm(c.ticketId)}><i className="ti ti-sparkles" /> Analisar</button>
                  <button className="ghost-btn" style={{ fontSize: 11.5, color: "#C97064" }} onClick={() => remover(c.ticketId)} title="Remover da lista"><i className="ti ti-x" /></button>
                </div>
              ) : c._sent ? (
                <div style={{ fontSize: 12, color: "#10b981" }}><i className="ti ti-check" /> Enviado.</div>
              ) : c.enviar ? (
                <>
                  <textarea value={c.mensagem} onChange={(e) => patch(c.ticketId, { mensagem: e.target.value })} rows={3} style={{ ...inp, resize: "vertical" }} placeholder="Mensagem de follow-up…" />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="cta-btn" style={{ fontSize: 12 }} disabled={c._busy || !c.mensagem.trim()} onClick={() => enviar(c.ticketId, c.mensagem)}><i className="ti ti-send" /> Enviar</button>
                    <button className="ghost-btn" style={{ fontSize: 12 }} disabled={c._busy} onClick={() => regenerar(c.ticketId)}><i className={`ti ${c._busy ? "ti-loader-2" : "ti-refresh"}`} /> Regenerar</button>
                    <button className="ghost-btn" style={{ fontSize: 12, color: "#C97064", marginLeft: "auto" }} onClick={() => remover(c.ticketId)}><i className="ti ti-x" /> Descartar</button>
                  </div>
                </>
              ) : (
                <button className="ghost-btn" style={{ fontSize: 11.5, color: "#C97064" }} onClick={() => remover(c.ticketId)}><i className="ti ti-trash" /> Remover da lista</button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ===== Lista de sequências =====
function Sequencias({ lista, onNova, onEditar }: { lista: Sequencia[]; onNova: () => void; onEditar: (s: Sequencia) => void }) {
  const router = useRouter();
  const [, start] = useTransition();

  return (
    <>
      <button className="cta-btn" onClick={onNova} style={{ marginBottom: 14 }}>
        <i className="ti ti-plus" /> Nova sequência
      </button>

      {lista.length === 0 ? (
        <Empty icon="ti-timeline-event" label="Nenhuma sequência ainda. Crie uma para começar." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {lista.map((s) => (
            <div key={s.id} className="mk-card" style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--mk-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.nome}</div>
                  {s.descricao && <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 2 }}>{s.descricao}</div>}
                </div>
                <Switch on={s.ativo} onToggle={() => start(async () => { await toggleSequencia(s.id, !s.ativo); router.refresh(); })} />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                <Chip icon="ti-timeline-event">{(s.etapas || []).length} etapa(s)</Chip>
                <Chip icon="ti-clock">{hhmm(s.janela_inicio)}–{hhmm(s.janela_fim)}</Chip>
                <Chip icon="ti-bolt">delay {s.delay_min_seg}–{s.delay_max_seg}s</Chip>
                <Chip icon="ti-shield">teto {s.teto_dia}/dia</Chip>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="ghost-btn" style={{ fontSize: 12, flex: 1 }} onClick={() => onEditar(s)}><i className="ti ti-pencil" /> Editar</button>
                <button className="ghost-btn" style={{ fontSize: 12, color: "#C97064" }} onClick={() => { if (confirm(`Excluir "${s.nome}"? As inscrições ativas serão removidas.`)) start(async () => { await excluirSequencia(s.id); router.refresh(); }); }}>
                  <i className="ti ti-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ===== Fila =====
function Fila({ itens }: { itens: FilaItem[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [mount, setMount] = useState(false);
  useEffect(() => setMount(true), []);

  if (itens.length === 0) return <Empty icon="ti-users" label="Ninguém na fila. Inscreva um atendimento pelo painel do contato." />;

  return (
    <div className="mk-card" style={{ padding: 0, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "0.5px solid var(--mk-border)" }}>
            <Th>Contato</Th><Th>Sequência</Th><Th>Etapa</Th><Th>Próximo envio</Th><Th>Status</Th><Th> </Th>
          </tr>
        </thead>
        <tbody>
          {itens.map((it) => {
            const c = uno(it.contato); const sq = uno(it.sequencia);
            return (
              <tr key={it.id} style={{ borderBottom: "0.5px solid var(--mk-border)" }}>
                <Td><strong>{c?.nome || "—"}</strong><div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>{c?.whatsapp}</div></Td>
                <Td>{sq?.nome || "—"}</Td>
                <Td>{it.etapa_atual}</Td>
                <Td>{mount ? relativo(it.proximo_envio_em) : ""}</Td>
                <Td><StatusBadge s={it.status} /></Td>
                <Td><button className="ghost-btn" style={{ fontSize: 11, color: "#C97064" }} onClick={() => start(async () => { await cancelarInscricao(it.id); router.refresh(); })}>Cancelar</button></Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ===== Editor (Balao) =====
function Editor({ inicial, etiquetas, onClose }: { inicial: SequenciaInput; etiquetas: Etiqueta[]; onClose: () => void }) {
  const router = useRouter();
  const [s, setS] = useState<SequenciaInput>(inicial);
  const [erro, setErro] = useState("");
  const [saving, start] = useTransition();

  function set<K extends keyof SequenciaInput>(k: K, v: SequenciaInput[K]) { setS((p) => ({ ...p, [k]: v })); }

  function addEtapa() { if (s.etapas.length >= 3) return; setS((p) => ({ ...p, etapas: [...p.etapas, { apos_horas: 1, mensagens: [{ tipo: "texto", conteudo: "" }] }] })); }
  function rmEtapa(i: number) { setS((p) => ({ ...p, etapas: p.etapas.filter((_, j) => j !== i) })); }
  function setEtapa(i: number, e: { apos_horas: number; mensagens: MsgEtapaInput[] }) { setS((p) => ({ ...p, etapas: p.etapas.map((x, j) => (j === i ? e : x)) })); }

  function salvar() {
    setErro("");
    start(async () => {
      const r = await salvarSequencia(s);
      if (r?.ok) { onClose(); router.refresh(); } else setErro(r?.erro || "Falha ao salvar");
    });
  }

  return (
    <Balao open onClose={onClose} titulo={s.id ? "Editar sequência" : "Nova sequência"} icone="ti-timeline-event" largura={560}
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", width: "100%" }}>
          {erro && <span style={{ color: "#C97064", fontSize: 11.5, marginRight: "auto", alignSelf: "center" }}>{erro}</span>}
          <button className="ghost-btn" onClick={onClose}>Cancelar</button>
          <button className="cta-btn" onClick={salvar} disabled={saving}><i className="ti ti-device-floppy" /> {saving ? "Salvando…" : "Salvar"}</button>
        </div>
      }>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Campo label="Nome"><input value={s.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex: Cobrança PIX" style={inp} /></Campo>
        <Campo label="Descrição (opcional)"><input value={s.descricao || ""} onChange={(e) => set("descricao", e.target.value)} style={inp} /></Campo>

        <Campo label="Etiqueta gatilho (opcional) — inscreve o contato ao marcar esta etiqueta">
          <select value={s.etiqueta_gatilho_id || ""} onChange={(e) => set("etiqueta_gatilho_id", e.target.value || null)} style={inp}>
            <option value="">— Sem gatilho (inscrição manual) —</option>
            {etiquetas.map((et) => <option key={et.id} value={et.id}>{et.nome}</option>)}
          </select>
        </Campo>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Campo label="Janela início"><input type="time" value={s.janela_inicio} onChange={(e) => set("janela_inicio", e.target.value)} style={inp} /></Campo>
          <Campo label="Janela fim"><input type="time" value={s.janela_fim} onChange={(e) => set("janela_fim", e.target.value)} style={inp} /></Campo>
          <Campo label="Delay min (s)"><input type="number" min={0} value={s.delay_min_seg} onChange={(e) => set("delay_min_seg", +e.target.value)} style={inp} /></Campo>
          <Campo label="Delay máx (s)"><input type="number" min={0} value={s.delay_max_seg} onChange={(e) => set("delay_max_seg", +e.target.value)} style={inp} /></Campo>
          <Campo label="Teto/dia (agência)"><input type="number" min={1} value={s.teto_dia} onChange={(e) => set("teto_dia", +e.target.value)} style={inp} /></Campo>
          <label style={{ display: "flex", alignItems: "flex-end", gap: 8, fontSize: 12.5, color: "var(--mk-text-secondary)", paddingBottom: 8 }}>
            <input type="checkbox" checked={s.ativo} onChange={(e) => set("ativo", e.target.checked)} /> Ativa
          </label>
        </div>

        <div style={{ borderTop: "0.5px solid var(--mk-border)", paddingTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <strong style={{ fontSize: 12.5, color: "var(--mk-text)" }}>Etapas ({s.etapas.length}/3)</strong>
            <button className="ghost-btn" style={{ fontSize: 11.5, marginLeft: "auto" }} disabled={s.etapas.length >= 3} onClick={addEtapa}><i className="ti ti-plus" /> Etapa</button>
          </div>
          {s.etapas.map((e, i) => (
            <EtapaEditor key={i} idx={i} etapa={e} onChange={(v) => setEtapa(i, v)} onRemove={() => rmEtapa(i)} />
          ))}
        </div>

        <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", lineHeight: 1.5, display: "flex", gap: 6 }}>
          <i className="ti ti-shield-check" style={{ marginTop: 1, color: "#10b981" }} />
          Pausa sozinho quando o cliente responde. Só envia dentro da janela. Delay entre mensagens evita cara de robô.
        </div>
      </div>
    </Balao>
  );
}

function EtapaEditor({ idx, etapa, onChange, onRemove }: { idx: number; etapa: { apos_horas: number; mensagens: MsgEtapaInput[] }; onChange: (v: { apos_horas: number; mensagens: MsgEtapaInput[] }) => void; onRemove: () => void }) {
  function setMsg(i: number, m: MsgEtapaInput) { onChange({ ...etapa, mensagens: etapa.mensagens.map((x, j) => (j === i ? m : x)) }); }
  function addMsg() { onChange({ ...etapa, mensagens: [...etapa.mensagens, { tipo: "texto", conteudo: "" }] }); }
  function rmMsg(i: number) { onChange({ ...etapa, mensagens: etapa.mensagens.filter((_, j) => j !== i) }); }

  return (
    <div style={{ border: "0.5px solid var(--mk-border)", borderRadius: 8, padding: 10, marginBottom: 8, background: "var(--mk-surface)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--mk-text)" }}>Follow-up {idx + 1}</span>
        <span style={{ fontSize: 11, color: "var(--mk-text-muted)", marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
          enviar após
          <input type="number" min={0} step={0.5} value={etapa.apos_horas} onChange={(e) => onChange({ ...etapa, apos_horas: +e.target.value })} style={{ ...inp, width: 60, padding: "4px 6px" }} /> h
        </span>
        <button className="ghost-btn" style={{ fontSize: 11, color: "#C97064", padding: "2px 6px" }} onClick={onRemove}><i className="ti ti-trash" /></button>
      </div>

      {etapa.mensagens.map((m, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8, paddingLeft: 8, borderLeft: "2px solid var(--mk-border)" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select value={m.tipo} onChange={(e) => setMsg(i, { ...m, tipo: e.target.value as Tipo })} style={{ ...inp, width: 130, padding: "5px 8px" }}>
              {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
            {etapa.mensagens.length > 1 && <button className="ghost-btn" style={{ fontSize: 10.5, color: "#C97064", marginLeft: "auto", padding: "2px 6px" }} onClick={() => rmMsg(i)}><i className="ti ti-x" /></button>}
          </div>
          {m.tipo === "texto" ? (
            <>
              <textarea value={m.conteudo || ""} onChange={(e) => setMsg(i, { ...m, conteudo: e.target.value })} placeholder="Mensagem…" rows={2} style={{ ...inp, resize: "vertical" }} />
              <textarea
                value={(m.variacoes || []).join("\n")}
                onChange={(e) => setMsg(i, { ...m, variacoes: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                placeholder="Variações anti-robô (uma por linha, opcional)"
                rows={2}
                style={{ ...inp, resize: "vertical", fontSize: 11, color: "var(--mk-text-secondary)" }}
              />
            </>
          ) : (
            <MediaMsg m={m} onChange={(mm) => setMsg(i, mm)} />
          )}
        </div>
      ))}
      <button className="ghost-btn" style={{ fontSize: 11, width: "100%" }} onClick={addMsg}><i className="ti ti-plus" /> Mensagem</button>
    </div>
  );
}

// ===== helpers / UI bits =====
function seqVazia(): SequenciaInput {
  return { nome: "", descricao: "", ativo: true, etiqueta_gatilho_id: null, delay_min_seg: 1, delay_max_seg: 2, janela_inicio: "08:00", janela_fim: "20:00", teto_dia: 50, etapas: [{ apos_horas: 1, mensagens: [{ tipo: "texto", conteudo: "" }] }] };
}
function paraInput(s: Sequencia): SequenciaInput {
  return {
    id: s.id, nome: s.nome, descricao: s.descricao || "", ativo: s.ativo, etiqueta_gatilho_id: s.etiqueta_gatilho_id,
    delay_min_seg: s.delay_min_seg, delay_max_seg: s.delay_max_seg,
    janela_inicio: hhmm(s.janela_inicio), janela_fim: hhmm(s.janela_fim), teto_dia: s.teto_dia,
    etapas: (s.etapas || []).sort((a, b) => a.ordem - b.ordem).map((e) => ({ apos_horas: Number(e.apos_horas), mensagens: (e.mensagens as MsgEtapaInput[]) || [] })),
  };
}
function relativo(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "agora";
  const min = Math.round(ms / 60000);
  if (min < 60) return `em ${min}min`;
  const h = Math.round(min / 60);
  if (h < 24) return `em ${h}h`;
  return `em ${Math.round(h / 24)}d`;
}

function TabBtn({ on, onClick, icon, children }: { on: boolean; onClick: () => void; icon: string; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ padding: "6px 14px", fontSize: 12.5, borderRadius: 7, border: 0, background: on ? "var(--mk-surface-2)" : "transparent", color: on ? "var(--mk-text)" : "var(--mk-text-muted)", fontWeight: on ? 600 : 400, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><i className={`ti ${icon}`} /> {children}</button>;
}
function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return <button type="button" role="switch" aria-checked={on} onClick={onToggle} style={{ width: 42, height: 24, borderRadius: 12, border: 0, cursor: "pointer", position: "relative", background: on ? "#10b981" : "var(--mk-surface-2)", flexShrink: 0 }}><span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.18s" }} /></button>;
}
function Chip({ icon, children }: { icon: string; children: React.ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--mk-text-muted)", background: "var(--mk-surface-2)", padding: "3px 8px", borderRadius: 6 }}><i className={`ti ${icon}`} /> {children}</span>;
}
function StatusBadge({ s }: { s: string }) {
  const cor = s === "ativo" ? "#10b981" : s === "pausado" ? "#f59e0b" : "#94a3b8";
  return <span style={{ fontSize: 10.5, color: cor, border: `0.5px solid ${cor}55`, borderRadius: 6, padding: "2px 8px" }}>{s}</span>;
}
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ display: "block", fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 4 }}>{label}</label>{children}</div>;
}
function Th({ children }: { children: React.ReactNode }) { return <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10.5, fontWeight: 600, color: "var(--mk-text-muted)", letterSpacing: 0.3 }}>{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--mk-text)" }}>{children}</td>; }
function Empty({ icon, label }: { icon: string; label: string }) {
  return <div className="mk-card" style={{ textAlign: "center", padding: 50, color: "var(--mk-text-muted)" }}><i className={`ti ${icon}`} style={{ display: "block", fontSize: 32, marginBottom: 8, opacity: 0.6 }} />{label}</div>;
}

const ACCEPT: Record<string, string> = { imagem: "image/*", video: "video/*", audio: "audio/*", documento: ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip" };

function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}

function MediaMsg({ m, onChange }: { m: MsgEtapaInput; onChange: (m: MsgEtapaInput) => void }) {
  const [up, setUp] = useState(false);
  const [erro, setErro] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const temMidia = !!(m.midia_path || m.midia_url);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (ref.current) ref.current.value = "";
    if (!f) return;
    setErro(""); setUp(true);
    try {
      const b64 = await fileToBase64(f);
      const r = await fetch("/api/follow-up/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileBase64: b64, filename: f.name, mime: f.type }) });
      const j = await r.json();
      if (j.ok) { onChange({ ...m, midia_path: j.path, midia_url: undefined, midia_filename: j.filename || f.name, midia_mime: j.mime || f.type }); setPreview(j.previewUrl || null); }
      else setErro(j.error || "Falha no upload");
    } catch { setErro("Falha no upload"); }
    finally { setUp(false); }
  }

  return (
    <>
      {temMidia ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "var(--mk-surface-2)", borderRadius: 6 }}>
          <i className="ti ti-paperclip" style={{ color: "#10b981" }} />
          <span style={{ fontSize: 11, color: "var(--mk-text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.midia_filename || m.midia_url || "Mídia anexada"}</span>
          {preview && m.tipo === "imagem" && <img src={preview} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover" }} />}
          <button type="button" className="ghost-btn" style={{ fontSize: 10.5, color: "#C97064", padding: "2px 6px" }} onClick={() => { onChange({ ...m, midia_path: undefined, midia_url: undefined, midia_filename: undefined }); setPreview(null); }}><i className="ti ti-x" /></button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button type="button" className="ghost-btn" style={{ fontSize: 11 }} disabled={up} onClick={() => ref.current?.click()}>
            <i className={`ti ${up ? "ti-loader-2" : "ti-upload"}`} /> {up ? "Enviando…" : "Enviar arquivo"}
          </button>
          <input ref={ref} type="file" hidden accept={ACCEPT[m.tipo] || "*"} onChange={onPick} />
          <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>ou</span>
          <input value={m.midia_url || ""} onChange={(e) => onChange({ ...m, midia_url: e.target.value })} placeholder="cole uma URL" style={{ ...inp, padding: "5px 8px" }} />
        </div>
      )}
      <input value={m.conteudo || ""} onChange={(e) => onChange({ ...m, conteudo: e.target.value })} placeholder="Legenda (opcional)" style={inp} />
      {erro && <span style={{ fontSize: 10.5, color: "#C97064" }}>{erro}</span>}
    </>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box" };
