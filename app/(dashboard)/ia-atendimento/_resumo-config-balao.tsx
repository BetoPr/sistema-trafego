"use client";

import { useState, useTransition } from "react";
import { Balao } from "@/components/ui/Balao";
import { salvarResumoConfig } from "./_actions";

interface CanalOpt { id: string; nome: string; status: string }

export interface ResumoConfig {
  ativo: boolean;
  modelo_groq: string;
  destino_tipo: "grupo" | "privado";
  canal_id: string | null;
  grupo_jid: string | null;
  telefone: string | null;
  prompt_resumo: string;
  disparar_em: string;
  tem_chave: boolean;
}

const MODELOS_GROQ = [
  { id: "llama-3.3-70b-versatile", nome: "Llama 3.3 70B (recomendado)" },
  { id: "llama-3.1-8b-instant", nome: "Llama 3.1 8B (rápido)" },
  { id: "deepseek-r1-distill-llama-70b", nome: "DeepSeek R1 Distill" },
];

const lbl: React.CSSProperties = { fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, display: "block", fontFamily: "monospace" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "0.5px solid var(--mk-border)", borderRadius: 8, background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };

export default function ResumoConfigBalao({
  perfilId,
  canais,
  config,
}: {
  perfilId: string;
  canais: CanalOpt[];
  config: ResumoConfig | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const [ativo, setAtivo] = useState(config?.ativo ?? false);
  const [modeloGroq, setModeloGroq] = useState(config?.modelo_groq || "llama-3.3-70b-versatile");
  const [destinoTipo, setDestinoTipo] = useState<"grupo" | "privado">(config?.destino_tipo || "grupo");
  const [canalId, setCanalId] = useState(config?.canal_id || "");
  const [grupoJid, setGrupoJid] = useState(config?.grupo_jid || "");
  const [telefone, setTelefone] = useState(config?.telefone || "");
  const [promptResumo, setPromptResumo] = useState(config?.prompt_resumo || "Resuma a conversa abaixo em 3-5 bullets curtos (cliente, interesse, gatilho de transferencia, observacoes). Seja direto.");
  const [dispararEm, setDispararEm] = useState(config?.disparar_em || "transferir_humano");
  const [groqApiKey, setGroqApiKey] = useState("");

  const [grupos, setGrupos] = useState<Array<{ jid: string; nome: string }>>([]);
  const [loadingGrupos, setLoadingGrupos] = useState(false);

  async function buscarGrupos() {
    if (!canalId) {
      setToast("Selecione um canal primeiro");
      return;
    }
    setLoadingGrupos(true);
    try {
      const r = await fetch(`/api/ia-atendimento/listar-grupos?canal_id=${canalId}`);
      const j = await r.json();
      if (j.ok) setGrupos(j.grupos);
      else setToast(`Erro: ${j.error}`);
    } catch (e) {
      setToast(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoadingGrupos(false);
  }

  async function salvar() {
    const fd = new FormData();
    fd.set("perfil_id", perfilId);
    fd.set("ativo", ativo ? "1" : "");
    fd.set("modelo_groq", modeloGroq);
    fd.set("destino_tipo", destinoTipo);
    fd.set("canal_id", canalId);
    if (destinoTipo === "grupo") fd.set("grupo_jid", grupoJid);
    else fd.set("telefone", telefone);
    fd.set("prompt_resumo", promptResumo);
    fd.set("disparar_em", dispararEm);
    if (groqApiKey) fd.set("groq_api_key", groqApiKey);

    start(async () => {
      const r = await salvarResumoConfig(fd);
      if (r.ok) {
        setToast("Salvo");
        setAberto(false);
      } else {
        setToast(`Erro: ${r.error}`);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="ghost-btn"
        style={{ fontSize: 12, padding: "8px 12px", marginTop: 8 }}
      >
        <i className="ti ti-message-2-share" /> Configurar envio de resumo {config?.ativo ? "(ativo)" : "(inativo)"}
      </button>

      <Balao
        open={aberto}
        onClose={() => setAberto(false)}
        titulo="Envio de Resumo no grupo/privado"
        icone="ti-message-2-share"
        largura={680}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, color: "var(--mk-text-muted)" }}>
            Quando a IA transferir o ticket pra humano, gera resumo da pré-qualificação via Groq + envia.
          </div>

          <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 12 }}>
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            Ativo
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Modelo Groq</label>
              <select value={modeloGroq} onChange={(e) => setModeloGroq(e.target.value)} style={inp}>
                {MODELOS_GROQ.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Chave API Groq {config?.tem_chave ? "(deixe em branco pra manter)" : ""}</label>
              <input
                type="password"
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                placeholder={config?.tem_chave ? "••••••••" : "gsk_..."}
                style={inp}
              />
            </div>
          </div>

          <div>
            <label style={lbl}>Canal (conexão WhatsApp)</label>
            <select value={canalId} onChange={(e) => { setCanalId(e.target.value); setGrupos([]); }} style={inp}>
              <option value="">— Selecione —</option>
              {canais.map((c) => <option key={c.id} value={c.id}>{c.nome} {c.status !== "connected" ? "(desconectado)" : ""}</option>)}
            </select>
          </div>

          <div>
            <label style={lbl}>Destino</label>
            <div style={{ display: "flex", gap: 12 }}>
              <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                <input type="radio" name="destino_tipo" checked={destinoTipo === "grupo"} onChange={() => setDestinoTipo("grupo")} />
                Grupo
              </label>
              <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                <input type="radio" name="destino_tipo" checked={destinoTipo === "privado"} onChange={() => setDestinoTipo("privado")} />
                Privado (número)
              </label>
            </div>
          </div>

          {destinoTipo === "grupo" ? (
            <div>
              <label style={lbl}>Grupo</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={grupoJid} onChange={(e) => setGrupoJid(e.target.value)} style={{ ...inp, flex: 1 }}>
                  <option value="">— Selecione —</option>
                  {grupos.map((g) => <option key={g.jid} value={g.jid}>{g.nome}</option>)}
                  {grupoJid && !grupos.find((g) => g.jid === grupoJid) && (
                    <option value={grupoJid}>{grupoJid} (atual)</option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={buscarGrupos}
                  disabled={loadingGrupos || !canalId}
                  className="ghost-btn"
                  style={{ fontSize: 12 }}
                >
                  <i className={`ti ${loadingGrupos ? "ti-loader-2" : "ti-refresh"}`} />
                  {loadingGrupos ? " Buscando..." : " Buscar grupos"}
                </button>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 4 }}>
                ID do grupo (jid): <code style={{ fontFamily: "monospace" }}>{grupoJid || "—"}</code>
              </div>
            </div>
          ) : (
            <div>
              <label style={lbl}>Telefone (com DDI, só números)</label>
              <input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="5581991594716"
                style={inp}
              />
            </div>
          )}

          <div>
            <label style={lbl}>Prompt do resumo (system pro Groq)</label>
            <textarea
              value={promptResumo}
              onChange={(e) => setPromptResumo(e.target.value)}
              rows={4}
              style={{ ...inp, resize: "vertical", fontFamily: "monospace", fontSize: 11.5 }}
            />
          </div>

          <div>
            <label style={lbl}>Disparar em</label>
            <select value={dispararEm} onChange={(e) => setDispararEm(e.target.value)} style={inp}>
              <option value="transferir_humano">Quando IA transferir pra humano</option>
              <option value="encerrar">Quando ticket for encerrado</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={() => setAberto(false)} className="ghost-btn" style={{ fontSize: 12 }}>Cancelar</button>
            <button type="button" onClick={salvar} disabled={pending} className="cta-btn" style={{ fontSize: 12 }}>
              <i className="ti ti-device-floppy" /> Salvar
            </button>
          </div>
        </div>
      </Balao>

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
            background: "rgba(155,125,191,0.95)",
            color: "#fff",
            fontSize: 12.5,
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
