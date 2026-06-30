"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Balao } from "@/components/ui/Balao";
import { criarPipeline, atualizarPipeline, deletarPipeline, type EtapaInput } from "./_actions";

interface Etapa {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  notificar_fila_id: string | null;
  notificar_atendente_id: string | null;
}
interface Pipeline {
  id: string;
  nome: string;
  cor: string;
  etapas: Etapa[];
}

const PALETA = ["#00E19A", "#5cd0ff", "#9B7DBF", "#FFB547", "#FF5C72", "#6B8E4E"];

type EtapaForm = EtapaInput & { _key: string };

function novaEtapaForm(): EtapaForm {
  return {
    _key: Math.random().toString(36).slice(2),
    id: null,
    nome: "",
    cor: "#00a300",
    notificar_fila_id: null,
    notificar_atendente_id: null,
  };
}

export function PipelinesClient({
  pipelines,
  filas,
  usuarios,
}: {
  pipelines: Pipeline[];
  filas: Array<{ id: string; nome: string }>;
  usuarios: Array<{ id: string; nome: string }>;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState<{ modo: "novo" } | { modo: "edit"; id: string } | null>(null);
  const [nome, setNome] = useState("");
  const [etapas, setEtapas] = useState<EtapaForm[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [arrastando, setArrastando] = useState<string | null>(null);

  function iniciarNovo() {
    setNome("");
    setEtapas([novaEtapaForm()]);
    setAberto({ modo: "novo" });
  }
  function iniciarEdit(p: Pipeline) {
    setNome(p.nome);
    setEtapas(p.etapas.map((e) => ({
      _key: e.id,
      id: e.id,
      nome: e.nome,
      cor: e.cor,
      notificar_fila_id: e.notificar_fila_id,
      notificar_atendente_id: e.notificar_atendente_id,
    })));
    setAberto({ modo: "edit", id: p.id });
  }
  function fechar() { setAberto(null); }

  function addEtapa() { setEtapas((s) => [...s, novaEtapaForm()]); }
  function rmEtapa(key: string) { setEtapas((s) => s.filter((e) => e._key !== key)); }
  function patchEtapa(key: string, patch: Partial<EtapaForm>) {
    setEtapas((s) => s.map((e) => (e._key === key ? { ...e, ...patch } : e)));
  }
  function onDragOverEtapa(e: React.DragEvent, sobreKey: string) {
    if (!arrastando || arrastando === sobreKey) return;
    e.preventDefault();
    setEtapas((prev) => {
      const a = prev.findIndex((x) => x._key === arrastando);
      const b = prev.findIndex((x) => x._key === sobreKey);
      if (a < 0 || b < 0) return prev;
      const nv = [...prev];
      const [item] = nv.splice(a, 1);
      nv.splice(b, 0, item);
      return nv;
    });
  }

  async function submit() {
    if (!aberto || !nome.trim()) return;
    setSalvando(true);
    const payload: EtapaInput[] = etapas.map((e) => ({
      id: e.id,
      nome: e.nome,
      cor: e.cor,
      notificar_fila_id: e.notificar_fila_id,
      notificar_atendente_id: e.notificar_atendente_id,
    }));
    const r = aberto.modo === "novo"
      ? await criarPipeline(nome, payload)
      : await atualizarPipeline(aberto.id, nome, payload);
    setSalvando(false);
    if (r.ok) { fechar(); router.refresh(); } else alert(r.msg);
  }

  async function deletar(p: Pipeline) {
    if (!confirm(`Deletar pipeline "${p.nome}"? Etapas e cards vão junto. Não pode ser desfeito.`)) return;
    const r = await deletarPipeline(p.id);
    if (r.ok) router.refresh(); else alert(r.msg);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Pipelines</h2>
          <p style={{ fontSize: 12, color: "var(--mk-text-muted)", margin: "4px 0 0" }}>Crie e gerencie funis. Cada pipeline tem suas etapas (colunas do Kanban).</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => router.refresh()} style={btnGhost}>
            <i className="ti ti-refresh" style={{ marginRight: 4 }} /> Atualizar
          </button>
          <button type="button" onClick={iniciarNovo} className="cta-btn" style={{ fontSize: 12, padding: "8px 14px" }}>
            <i className="ti ti-plus" style={{ marginRight: 4 }} /> Novo Pipeline
          </button>
        </div>
      </div>

      <div className="mk-card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: "var(--mk-surface-2)", textAlign: "left" }}>
              <th style={th}>#</th>
              <th style={th}>Nome</th>
              <th style={{ ...th, textAlign: "center" }}>Etapas</th>
              <th style={{ ...th, textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pipelines.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 28, textAlign: "center", color: "var(--mk-text-muted)" }}>Nenhum pipeline ainda. Crie o primeiro.</td></tr>
            )}
            {pipelines.map((p, i) => (
              <tr key={p.id} style={{ borderTop: ".5px solid var(--mk-border)" }}>
                <td style={td}>{i + 1}</td>
                <td style={{ ...td, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.cor }} />
                  {p.nome}
                </td>
                <td style={{ ...td, textAlign: "center", color: "var(--mk-text-muted)" }}>{p.etapas.length}</td>
                <td style={{ ...td, textAlign: "right" }}>
                  <button type="button" onClick={() => iniciarEdit(p)} title="Editar" style={iconBtn}>
                    <i className="ti ti-pencil" />
                  </button>
                  <button type="button" onClick={() => deletar(p)} title="Deletar" style={{ ...iconBtn, color: "#FF5C72" }}>
                    <i className="ti ti-trash" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Balao
        open={!!aberto}
        onClose={fechar}
        titulo={aberto?.modo === "edit" ? "Editar Pipeline" : "Novo Pipeline"}
        icone="ti-route"
        largura={520}
      >
        <div style={{ padding: "8px 4px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={lbl}>Nome do Pipeline *</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do pipeline" style={inp} autoFocus />
          </div>

          <div>
            <label style={{ ...lbl, marginBottom: 8 }}>Etapas</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {etapas.map((e) => (
                <div
                  key={e._key}
                  draggable
                  onDragStart={() => setArrastando(e._key)}
                  onDragEnd={() => setArrastando(null)}
                  onDragOver={(ev) => onDragOverEtapa(ev, e._key)}
                  style={{
                    border: ".5px solid var(--mk-border)",
                    background: "var(--mk-surface)",
                    borderRadius: 10,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    opacity: arrastando === e._key ? 0.4 : 1,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <i className="ti ti-grip-vertical" style={{ color: "var(--mk-text-muted)", cursor: "grab" }} />
                    <button type="button" onClick={() => rmEtapa(e._key)} style={{ background: "transparent", border: 0, color: "#FF5C72", cursor: "pointer", fontSize: 11.5 }}>
                      <i className="ti ti-trash" style={{ marginRight: 3 }} /> Remover
                    </button>
                  </div>
                  <div>
                    <label style={lbl}>Nome da Etapa</label>
                    <input type="text" value={e.nome} onChange={(ev) => patchEtapa(e._key, { nome: ev.target.value })} placeholder="Nome da etapa" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Cor</label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {PALETA.map((c) => (
                        <button key={c} type="button" onClick={() => patchEtapa(e._key, { cor: c })} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: e.cor === c ? "2px solid var(--mk-text)" : "1px solid var(--mk-border)", cursor: "pointer" }} />
                      ))}
                      <span style={{ fontSize: 11, color: "var(--mk-text-muted)", marginLeft: 4 }}>{e.cor}</span>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Notificar fila ao entrar</label>
                    <select value={e.notificar_fila_id ?? ""} onChange={(ev) => patchEtapa(e._key, { notificar_fila_id: ev.target.value || null })} style={inp}>
                      <option value="">Não notificar</option>
                      {filas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Notificar atendente ao entrar</label>
                    <select value={e.notificar_atendente_id ?? ""} onChange={(ev) => patchEtapa(e._key, { notificar_atendente_id: ev.target.value || null })} style={inp}>
                      <option value="">Não notificar</option>
                      {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addEtapa} style={{ border: ".5px dashed var(--mk-border)", background: "transparent", color: "var(--mk-text-muted)", padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
                <i className="ti ti-plus" style={{ marginRight: 4 }} /> Adicionar Etapa
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: ".5px solid var(--mk-border)", paddingTop: 12 }}>
            <button type="button" onClick={fechar} style={btnGhost}>Cancelar</button>
            <button type="button" onClick={submit} disabled={salvando} className="cta-btn" style={{ fontSize: 12.5, padding: "8px 16px", opacity: salvando ? 0.6 : 1 }}>
              {aberto?.modo === "edit" ? "Salvar" : "Criar"}
            </button>
          </div>
        </div>
      </Balao>
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "var(--mk-text-muted)", letterSpacing: 0.4, textTransform: "uppercase" };
const td: React.CSSProperties = { padding: "12px 14px" };
const iconBtn: React.CSSProperties = { background: "transparent", border: 0, color: "var(--mk-text-muted)", cursor: "pointer", fontSize: 14, padding: 6, marginLeft: 4 };
const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--mk-text-muted)", marginBottom: 4, letterSpacing: 0.3, textTransform: "uppercase" };
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
  background: "transparent",
  border: ".5px solid var(--mk-border)",
  color: "var(--mk-text)",
  fontSize: 12.5,
  padding: "8px 14px",
  borderRadius: 8,
  cursor: "pointer",
};
