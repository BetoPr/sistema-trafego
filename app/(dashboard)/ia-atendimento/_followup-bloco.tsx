"use client";

import { useEffect, useState, useTransition } from "react";
import { Balao } from "@/components/ui/Balao";
import { CheckSucesso } from "./_check-sucesso";
import {
  criarSequenciaFollowUp,
  atualizarSequenciaFollowUp,
  deletarSequenciaFollowUp,
  salvarEtapaFollowUp,
  deletarEtapaFollowUp,
  reordenarEtapasFollowUp,
  uploadMidiaFollowUp,
} from "./_actions";

export type FollowupSeq = {
  id: string;
  nome: string;
  descricao: string | null;
  ordem_no_perfil: number;
  ativa: boolean;
  finalizar_ticket_ao_fim: boolean;
  etiqueta_em_progresso_id: string | null;
  etiqueta_encerrado_id: string | null;
  janela_inicio: string;
  janela_fim: string;
};

export type FollowupEtapa = {
  id: string;
  sequencia_id: string;
  ordem: number;
  delay_segundos_antes: number;
  midia_tipo: "texto" | "imagem" | "video" | "audio" | "documento";
  texto: string | null;
  midia_path: string | null;
  midia_url: string | null;
  midia_mime: string | null;
  midia_filename: string | null;
};

type EtiquetaOpt = { id: string; nome: string; cor: string };

const lbl: React.CSSProperties = { fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, display: "block", fontFamily: "monospace" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "0.5px solid var(--mk-border)", borderRadius: 8, background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };

export default function FollowUpBloco({
  perfilId,
  sequencias,
  etapas,
  etiquetas,
}: {
  perfilId: string;
  sequencias: FollowupSeq[];
  etapas: FollowupEtapa[];
  etiquetas: EtiquetaOpt[];
}) {
  const [editSeq, setEditSeq] = useState<FollowupSeq | null>(null);
  const [criandoNova, setCriandoNova] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "erro" } | null>(null);
  const [sucesso, setSucesso] = useState(false);

  // Animacao de sucesso some sozinha apos ~1.8s
  useEffect(() => {
    if (!sucesso) return;
    const t = setTimeout(() => setSucesso(false), 1800);
    return () => clearTimeout(t);
  }, [sucesso]);

  const podeAdicionar = sequencias.length < 5;

  return (
    <div style={{ marginTop: 24, borderTop: "0.5px solid var(--mk-border)", paddingTop: 16 }}>
      <h3 className="card-title" style={{ marginBottom: 6 }}>
        <i className="ti ti-message-forward" style={{ color: "#C9A876", marginRight: 6 }} /> Follow-up sequencial
      </h3>
      <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 12 }}>
        Configure até 5 sequências de follow-up automático (max 6 etapas cada). Iniciam após o
        primeiro atendimento e cancelam quando o cliente responde.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sequencias.map((s) => {
          const ct = etapas.filter((e) => e.sequencia_id === s.id).length;
          return (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                border: "0.5px solid var(--mk-border)",
                borderRadius: 8,
                background: "var(--mk-surface)",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 4, background: s.ativa ? "#10b981" : "#6b7280" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.nome}</div>
                <div style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>
                  {ct} etapa{ct !== 1 ? "s" : ""} · {s.ativa ? "ativa" : "inativa"} · janela {s.janela_inicio.slice(0, 5)}–{s.janela_fim.slice(0, 5)}
                </div>
              </div>
              <button type="button" onClick={() => setEditSeq(s)} className="ghost-btn" style={{ fontSize: 12, padding: "6px 10px" }}>
                <i className="ti ti-edit" /> Editar
              </button>
            </div>
          );
        })}
        {sequencias.length === 0 && (
          <div style={{ padding: 14, color: "var(--mk-text-muted)", fontSize: 12, textAlign: "center", border: "0.5px dashed var(--mk-border)", borderRadius: 8 }}>
            Nenhuma sequência ainda. Crie a primeira pra automatizar follow-ups quando cliente não responde.
          </div>
        )}
      </div>

      {podeAdicionar && (
        <button
          type="button"
          onClick={() => setCriandoNova(true)}
          className="ghost-btn"
          style={{ fontSize: 12, marginTop: 10 }}
        >
          <i className="ti ti-plus" /> Nova sequência ({sequencias.length}/5)
        </button>
      )}

      {(editSeq || criandoNova) && (
        <Balao
          open
          onClose={() => { setEditSeq(null); setCriandoNova(false); }}
          titulo={editSeq ? `Editar — ${editSeq.nome}` : "Nova sequência"}
          icone="ti-message-forward"
          largura={760}
        >
          <SequenciaEditor
            perfilId={perfilId}
            sequencia={editSeq}
            etapasDaSeq={editSeq ? etapas.filter((e) => e.sequencia_id === editSeq.id) : []}
            etiquetas={etiquetas}
            onSaved={(msg) => { setToast({ msg, tipo: "ok" }); setEditSeq(null); setCriandoNova(false); }}
            onSucesso={() => { setEditSeq(null); setCriandoNova(false); setSucesso(true); }}
            onError={(msg) => setToast({ msg, tipo: "erro" })}
            ordemNoPerfil={editSeq?.ordem_no_perfil ?? sequencias.length + 1}
          />
        </Balao>
      )}

      {toast && (
        <div
          onClick={() => setToast(null)}
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 99999,
            padding: "10px 14px",
            borderRadius: 8,
            background: toast.tipo === "ok" ? "rgba(16,185,129,0.95)" : "rgba(201,112,100,0.95)",
            color: "#fff",
            fontSize: 12.5,
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {toast.msg}
        </div>
      )}

      <CheckSucesso open={sucesso} mensagem="Follow-up configurado!" onClose={() => setSucesso(false)} />
    </div>
  );
}

function SequenciaEditor({
  perfilId,
  sequencia,
  etapasDaSeq,
  etiquetas,
  onSaved,
  onSucesso,
  onError,
  ordemNoPerfil,
}: {
  perfilId: string;
  sequencia: FollowupSeq | null;
  etapasDaSeq: FollowupEtapa[];
  etiquetas: EtiquetaOpt[];
  onSaved: (msg: string) => void;
  onSucesso: () => void;
  onError: (msg: string) => void;
  ordemNoPerfil: number;
}) {
  const [nome, setNome] = useState(sequencia?.nome || "");
  const [ativa, setAtiva] = useState(sequencia?.ativa ?? true);
  const [finalizarTicket, setFinalizarTicket] = useState(sequencia?.finalizar_ticket_ao_fim ?? false);
  const [etqProgresso, setEtqProgresso] = useState(sequencia?.etiqueta_em_progresso_id || "");
  const [etqEncerrado, setEtqEncerrado] = useState(sequencia?.etiqueta_encerrado_id || "");
  const [janIni, setJanIni] = useState((sequencia?.janela_inicio || "08:00").slice(0, 5));
  const [janFim, setJanFim] = useState((sequencia?.janela_fim || "20:00").slice(0, 5));
  const [pending, start] = useTransition();
  const [etapas, setEtapas] = useState<FollowupEtapa[]>(etapasDaSeq);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Atualiza campos de uma etapa em memoria (persiste so no "Salvar tudo")
  function updateEtapa(id: string, patch: Partial<FollowupEtapa>) {
    setEtapas((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  // Salva meta da sequencia + todas as etapas de uma vez
  async function salvarTudo() {
    const fd = new FormData();
    fd.set("perfil_id", perfilId);
    fd.set("nome", nome);
    fd.set("ativa", ativa ? "1" : "");
    fd.set("finalizar_ticket_ao_fim", finalizarTicket ? "1" : "");
    fd.set("etiqueta_em_progresso_id", etqProgresso);
    fd.set("etiqueta_encerrado_id", etqEncerrado);
    fd.set("janela_inicio", janIni);
    fd.set("janela_fim", janFim);
    fd.set("ordem_no_perfil", String(ordemNoPerfil));

    start(async () => {
      // 1. Meta da sequencia
      const rMeta = sequencia
        ? await atualizarSequenciaFollowUp(sequencia.id, fd)
        : await criarSequenciaFollowUp(fd);
      if (!rMeta.ok) { onError(rMeta.error || "Erro ao salvar sequência"); return; }

      // 2. Todas as etapas (sequencia nova ainda nao tem etapas)
      if (sequencia) {
        for (const et of etapas) {
          const efd = new FormData();
          efd.set("sequencia_id", sequencia.id);
          efd.set("id", et.id);
          efd.set("ordem", String(et.ordem));
          efd.set("delay_segundos_antes", String(et.delay_segundos_antes));
          efd.set("midia_tipo", et.midia_tipo);
          efd.set("texto", et.texto || "");
          if (et.midia_path) efd.set("midia_path", et.midia_path);
          if (et.midia_url) efd.set("midia_url", et.midia_url);
          if (et.midia_mime) efd.set("midia_mime", et.midia_mime);
          if (et.midia_filename) efd.set("midia_filename", et.midia_filename);
          const re = await salvarEtapaFollowUp(efd);
          if (!re.ok) { onError(re.error || "Erro ao salvar etapa"); return; }
        }
      }

      onSucesso();
    });
  }

  async function deletar() {
    if (!sequencia) return;
    if (!confirm("Deletar essa sequência e todas as etapas? Inscrições ativas serão canceladas.")) return;
    start(async () => {
      const r = await deletarSequenciaFollowUp(sequencia.id);
      if (r.ok) onSaved("Sequência deletada");
      else onError(r.error || "Erro");
    });
  }

  function onDragStart(idx: number) { setDragIdx(idx); }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const novo = [...etapas];
    const [moved] = novo.splice(dragIdx, 1);
    novo.splice(idx, 0, moved);
    setEtapas(novo.map((e, i) => ({ ...e, ordem: i + 1 })));
    setDragIdx(idx);
  }
  async function onDragEnd() {
    if (dragIdx === null || !sequencia) { setDragIdx(null); return; }
    setDragIdx(null);
    const ids = etapas.map((e) => e.id);
    start(async () => { await reordenarEtapasFollowUp(sequencia.id, ids); });
  }

  async function adicionarEtapa() {
    if (!sequencia) return;
    if (etapas.length >= 6) return;
    const fd = new FormData();
    fd.set("sequencia_id", sequencia.id);
    fd.set("ordem", String(etapas.length + 1));
    fd.set("delay_segundos_antes", "3600");
    fd.set("midia_tipo", "texto");
    fd.set("texto", "Nova mensagem");
    const r = await salvarEtapaFollowUp(fd);
    if (r.ok && r.etapa) setEtapas([...etapas, r.etapa as FollowupEtapa]);
    else onError(r.error || "Erro");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={lbl}>Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>Ativa</label>
          <label style={{ display: "inline-flex", gap: 8, alignItems: "center", padding: "8px 0", fontSize: 12 }}>
            <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} /> Sim
          </label>
        </div>
        <div>
          <label style={lbl}>Etiqueta em progresso</label>
          <select value={etqProgresso} onChange={(e) => setEtqProgresso(e.target.value)} style={inp}>
            <option value="">— Nenhuma —</option>
            {etiquetas.map((e) => (<option key={e.id} value={e.id}>{e.nome}</option>))}
          </select>
        </div>
        <div>
          <label style={lbl}>Etiqueta ao encerrar</label>
          <select value={etqEncerrado} onChange={(e) => setEtqEncerrado(e.target.value)} style={inp}>
            <option value="">— Nenhuma —</option>
            {etiquetas.map((e) => (<option key={e.id} value={e.id}>{e.nome}</option>))}
          </select>
        </div>
        <div>
          <label style={lbl}>Janela início</label>
          <input type="time" value={janIni} onChange={(e) => setJanIni(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>Janela fim</label>
          <input type="time" value={janFim} onChange={(e) => setJanFim(e.target.value)} style={inp} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 12 }}>
            <input type="checkbox" checked={finalizarTicket} onChange={(e) => setFinalizarTicket(e.target.checked)} />
            Finalizar ticket após última etapa
          </label>
        </div>
      </div>

      {sequencia && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Etapas ({etapas.length}/6)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {etapas.map((etapa, idx) => (
              <EtapaCard
                key={etapa.id}
                etapa={etapa}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDragEnd={onDragEnd}
                onChange={(patch) => updateEtapa(etapa.id, patch)}
                onError={onError}
                onDeleted={async (id) => {
                  if (!confirm("Deletar etapa?")) return;
                  const r = await deletarEtapaFollowUp(id);
                  if (r.ok) setEtapas((prev) => prev.filter((e) => e.id !== id));
                  else onError(r.error || "Erro");
                }}
              />
            ))}
          </div>
          {etapas.length < 6 && (
            <button type="button" onClick={adicionarEtapa} className="ghost-btn" style={{ fontSize: 12, marginTop: 8 }}>
              <i className="ti ti-plus" /> Nova etapa
            </button>
          )}
        </div>
      )}

      {/* Acoes no rodape: um unico botao salva tudo */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", borderTop: "0.5px solid var(--mk-border)", paddingTop: 14, marginTop: 4 }}>
        {sequencia && (
          <button type="button" onClick={deletar} disabled={pending} className="ghost-btn" style={{ fontSize: 12, padding: "9px 16px", color: "#C97064", marginRight: "auto" }}>
            <i className="ti ti-trash" /> Deletar
          </button>
        )}
        <button type="button" onClick={salvarTudo} disabled={pending || !nome} className="cta-btn" style={{ fontSize: 12.5, padding: "9px 20px" }}>
          {pending ? (<><i className="ti ti-loader-2 spin" /> Salvando...</>) : (<><i className="ti ti-device-floppy" /> Salvar tudo</>)}
        </button>
      </div>
    </div>
  );
}

function EtapaCard({
  etapa,
  draggable,
  onDragStart,
  onDragOver,
  onDragEnd,
  onChange,
  onError,
  onDeleted,
}: {
  etapa: FollowupEtapa;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onChange: (patch: Partial<FollowupEtapa>) => void;
  onError: (msg: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const tipo = etapa.midia_tipo;

  async function uploadArquivo(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await uploadMidiaFollowUp(fd);
      if (r.ok && r.path) {
        onChange({ midia_path: r.path, midia_mime: r.mime || file.type, midia_filename: r.filename || file.name, midia_url: null });
      } else {
        onError(r.error || "Erro no upload");
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      style={{
        border: "0.5px solid var(--mk-border)",
        borderRadius: 8,
        padding: 12,
        background: "var(--mk-surface-2)",
        cursor: draggable ? "grab" : "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <i className="ti ti-grip-vertical" style={{ color: "var(--mk-text-muted)" }} />
        <strong style={{ fontSize: 13 }}>Etapa {etapa.ordem}</strong>
        <button type="button" onClick={() => onDeleted(etapa.id)} className="ghost-btn" style={{ marginLeft: "auto", fontSize: 11, color: "#C97064" }}>
          <i className="ti ti-trash" />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <label style={lbl}>Esperar (segundos antes desta etapa)</label>
          <input type="number" min={0} value={etapa.delay_segundos_antes} onChange={(e) => onChange({ delay_segundos_antes: parseInt(e.target.value || "0", 10) })} style={inp} />
        </div>
        <div>
          <label style={lbl}>Tipo</label>
          <select value={tipo} onChange={(e) => onChange({ midia_tipo: e.target.value as FollowupEtapa["midia_tipo"] })} style={inp}>
            <option value="texto">Texto</option>
            <option value="imagem">Imagem</option>
            <option value="video">Vídeo</option>
            <option value="audio">Áudio</option>
            <option value="documento">Documento</option>
          </select>
        </div>
      </div>

      {tipo === "texto" ? (
        <textarea
          value={etapa.texto || ""}
          onChange={(e) => onChange({ texto: e.target.value })}
          rows={3}
          style={{ ...inp, resize: "vertical" }}
          placeholder="Mensagem da etapa"
        />
      ) : (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) await uploadArquivo(file);
            }}
            style={{
              border: `0.5px dashed ${dragOver ? "#9B7DBF" : "var(--mk-border)"}`,
              borderRadius: 6,
              padding: 14,
              textAlign: "center",
              fontSize: 12,
              color: "var(--mk-text-muted)",
              background: dragOver ? "rgba(155,125,191,0.08)" : "transparent",
              cursor: "pointer",
            }}
            onClick={() => document.getElementById(`file-${etapa.id}`)?.click()}
          >
            {uploading ? (
              "Enviando..."
            ) : etapa.midia_path || etapa.midia_url ? (
              <>
                <i className="ti ti-file-check" style={{ color: "#10b981" }} />{" "}
                {etapa.midia_filename || "mídia anexada"}
                <div style={{ fontSize: 10.5, marginTop: 4 }}>Arraste outro arquivo pra substituir</div>
              </>
            ) : (
              <>
                <i className="ti ti-upload" /> Arraste o arquivo aqui ou clique pra escolher
              </>
            )}
            <input
              id={`file-${etapa.id}`}
              type="file"
              hidden
              accept={
                tipo === "imagem"
                  ? "image/*"
                  : tipo === "video"
                  ? "video/*"
                  : tipo === "audio"
                  ? "audio/*"
                  : ".pdf,.docx,.xlsx"
              }
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadArquivo(f); }}
            />
          </div>
          <input
            value={etapa.texto || ""}
            onChange={(e) => onChange({ texto: e.target.value })}
            placeholder="Legenda (opcional)"
            style={{ ...inp, marginTop: 6 }}
          />
        </>
      )}
    </div>
  );
}
