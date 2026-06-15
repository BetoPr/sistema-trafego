"use client";

import { useState } from "react";
import { Balao } from "@/components/ui/Balao";
import { criarEtiqueta } from "./_actions";

interface Etiqueta {
  id: string;
  nome: string;
  cor: string;
  palavra_gatilho: string | null;
  mensagem_resposta?: string | null;
  ativo: boolean;
}

const PALETA = [
  "#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#8b5cf6",
  "#ec4899", "#f43f5e", "#f59e0b", "#84cc16", "#64748b",
];

export function EtiquetasManager({ inicial }: { inicial: Etiqueta[] }) {
  const [lista, setLista] = useState<Etiqueta[]>(inicial);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(PALETA[0]);
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<Etiqueta | null>(null);

  async function adicionar() {
    const n = nome.trim();
    if (!n) return;
    setCriando(true);
    try {
      const r = await criarEtiqueta(n, cor);
      if (r.ok && r.id) {
        setLista((l) => [...l, { id: r.id!, nome: n, cor, palavra_gatilho: null, mensagem_resposta: null, ativo: true }].sort((a, b) => a.nome.localeCompare(b.nome)));
        setNome("");
      } else {
        alert(r.msg || "Falha ao criar.");
      }
    } finally {
      setCriando(false);
    }
  }

  async function excluir(e: Etiqueta) {
    if (!confirm(`Excluir a etiqueta "${e.nome}"? Vai remover de todos os contatos.`)) return;
    const r = await fetch(`/api/etiquetas/${e.id}`, { method: "DELETE" });
    if (r.ok) setLista((l) => l.filter((x) => x.id !== e.id));
    else alert("Falha ao excluir.");
  }

  function aposSalvar(atualizada: Etiqueta) {
    setLista((l) => l.map((x) => (x.id === atualizada.id ? atualizada : x)).sort((a, b) => a.nome.localeCompare(b.nome)));
    setEditando(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Criar nova */}
      <div>
        <div style={{ fontSize: 11, color: "var(--mk-text-muted)", letterSpacing: 0.4, marginBottom: 8, fontFamily: "monospace" }}>NOVA ETIQUETA</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={nome}
            onChange={(ev) => setNome(ev.target.value)}
            onKeyDown={(ev) => ev.key === "Enter" && adicionar()}
            placeholder="Nome da etiqueta (ex: Cliente VIP)"
            style={{ flex: 1, minWidth: 180, padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 }}
          />
          <Swatches valor={cor} onChange={setCor} />
          <button onClick={adicionar} disabled={criando || !nome.trim()} className="cta-btn" style={{ fontSize: 12 }}>
            <i className="ti ti-plus" /> {criando ? "Criando…" : "Criar"}
          </button>
        </div>
        <div style={{ marginTop: 8 }}>
          <Badge nome={nome || "Prévia"} cor={cor} />
        </div>
      </div>

      <div style={{ height: 0.5, background: "var(--mk-border)" }} />

      {/* Lista */}
      <div>
        <div style={{ fontSize: 11, color: "var(--mk-text-muted)", letterSpacing: 0.4, marginBottom: 8, fontFamily: "monospace" }}>
          ETIQUETAS ({lista.length})
        </div>
        {lista.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--mk-text-muted)", padding: "16px 0", textAlign: "center" }}>Nenhuma etiqueta criada ainda.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {lista.map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderBottom: "0.5px solid var(--mk-border)", opacity: e.ativo ? 1 : 0.5 }}>
                <Badge nome={e.nome} cor={e.cor} />
                {e.palavra_gatilho && (
                  <span title={`Gatilho: ${e.palavra_gatilho}`} style={{ fontSize: 10, color: "var(--mk-text-muted)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <i className="ti ti-bolt" /> {e.palavra_gatilho}
                  </span>
                )}
                {!e.ativo && <span style={{ fontSize: 9.5, color: "var(--mk-text-muted)", border: "0.5px solid var(--mk-border)", borderRadius: 6, padding: "1px 6px" }}>inativo</span>}
                <div style={{ flex: 1 }} />
                <button onClick={() => setEditando(e)} title="Editar" style={iconBtn}><i className="ti ti-pencil" /></button>
                <button onClick={() => excluir(e)} title="Excluir" style={{ ...iconBtn, color: "#f43f5e" }}><i className="ti ti-trash" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editando && (
        <EditarBalao etiqueta={editando} onClose={() => setEditando(null)} onSalvo={aposSalvar} />
      )}
    </div>
  );
}

function EditarBalao({ etiqueta, onClose, onSalvo }: { etiqueta: Etiqueta; onClose: () => void; onSalvo: (e: Etiqueta) => void }) {
  const [nome, setNome] = useState(etiqueta.nome);
  const [cor, setCor] = useState(etiqueta.cor);
  const [gatilhos, setGatilhos] = useState<string[]>(() => {
    const arr = (etiqueta.palavra_gatilho ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    return arr.length ? arr : [""];
  });
  const [ativo, setAtivo] = useState(etiqueta.ativo);
  const [mensagemResposta, setMensagemResposta] = useState(etiqueta.mensagem_resposta ?? "");
  const [salvando, setSalvando] = useState(false);

  const setGatilho = (i: number, v: string) => setGatilhos((g) => g.map((x, j) => (j === i ? v : x)));
  const addGatilho = () => setGatilhos((g) => [...g, ""]);
  const rmGatilho = (i: number) => setGatilhos((g) => (g.length <= 1 ? [""] : g.filter((_, j) => j !== i)));

  async function salvar() {
    if (!nome.trim()) { alert("Nome obrigatório."); return; }
    const gatilhoStr = gatilhos.map((x) => x.trim()).filter(Boolean).join(", ") || null;
    setSalvando(true);
    try {
      const respostaTrim = mensagemResposta.trim() || null;
      const r = await fetch(`/api/etiquetas/${etiqueta.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), cor, palavra_gatilho: gatilhoStr, mensagem_resposta: respostaTrim, ativo }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(`Falha: ${j.error || r.statusText}`);
        return;
      }
      onSalvo({ ...etiqueta, nome: nome.trim(), cor, palavra_gatilho: gatilhoStr, mensagem_resposta: respostaTrim, ativo });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Balao open onClose={onClose} titulo="Editar etiqueta" icone="ti-tag" largura={460}
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} className="ghost-btn" style={{ fontSize: 12 }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="cta-btn" style={{ fontSize: 12 }}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={lbl}>Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus style={inp} />
        </div>

        <div>
          <label style={lbl}>Cor</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} style={{ width: 56, height: 36, padding: 0, border: "0.5px solid var(--mk-border)", borderRadius: 8, background: "transparent", cursor: "pointer" }} />
            <input value={cor} onChange={(e) => setCor(e.target.value)} style={{ ...inp, flex: 1, fontFamily: "monospace" }} />
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {PALETA.map((c) => (
              <button key={c} onClick={() => setCor(c)} style={{ width: 22, height: 22, borderRadius: 6, background: c, border: c === cor ? "2px solid var(--mk-text)" : "1px solid rgba(255,255,255,0.2)", cursor: "pointer" }} />
            ))}
          </div>
          <div style={{ marginTop: 10 }}><Badge nome={nome || "Prévia"} cor={cor} /></div>
        </div>

        <div>
          <label style={lbl}>Palavras-chave gatilho</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {gatilhos.map((g, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input value={g} onChange={(e) => setGatilho(i, e.target.value)} placeholder="Ex: orçamento, urgente…" style={{ ...inp, flex: 1 }} />
                {(gatilhos.length > 1 || g.trim()) && (
                  <button type="button" onClick={() => rmGatilho(i)} title="Remover" style={{ background: "transparent", border: "0.5px solid var(--mk-border)", borderRadius: 8, width: 34, height: 34, color: "#C97064", cursor: "pointer", flexShrink: 0 }}>
                    <i className="ti ti-x" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addGatilho} className="ghost-btn" style={{ fontSize: 11.5, marginTop: 6 }}>
            <i className="ti ti-plus" /> Adicionar mais
          </button>
          <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 6, lineHeight: 1.5 }}>
            Quando QUALQUER uma dessas palavras aparecer numa mensagem recebida, a etiqueta é aplicada automaticamente ao contato.
          </div>
        </div>

        <div>
          <label style={lbl}>Mensagem automática <span style={{ color: "var(--mk-text-muted)", fontWeight: 400 }}>(opcional)</span></label>
          <textarea
            value={mensagemResposta}
            onChange={(e) => setMensagemResposta(e.target.value)}
            placeholder="Quando a etiqueta for aplicada pelo gatilho, envia essa mensagem automática pro cliente. Deixe vazio pra não enviar nada."
            rows={4}
            style={{ ...inp, fontFamily: "inherit", resize: "vertical", minHeight: 80 }}
          />
          <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 6, lineHeight: 1.5 }}>
            Dispara <strong>uma única vez</strong> por contato — só quando a etiqueta é aplicada pela 1ª vez via gatilho. Não é enviada se você marcar a etiqueta manualmente.
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, cursor: "pointer" }}>
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          <span style={{ fontWeight: 600 }}>Ativo</span>
          <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>(inativa some do menu e não dispara o gatilho)</span>
        </label>
      </div>
    </Balao>
  );
}

function Badge({ nome, cor }: { nome: string; cor: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 12, background: `${cor}22`, color: cor, border: `1px solid ${cor}`, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <i className="ti ti-tag" style={{ fontSize: 10 }} /> {nome}
    </span>
  );
}

function Swatches({ valor, onChange }: { valor: string; onChange: (c: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {PALETA.slice(0, 6).map((c) => (
        <button key={c} onClick={() => onChange(c)} title={c} style={{ width: 22, height: 22, borderRadius: 6, background: c, border: c === valor ? "2px solid var(--mk-text)" : "1px solid rgba(255,255,255,0.2)", cursor: "pointer" }} />
      ))}
      <input type="color" value={valor} onChange={(e) => onChange(e.target.value)} title="Cor personalizada" style={{ width: 26, height: 24, padding: 0, border: 0, background: "transparent", cursor: "pointer" }} />
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
const iconBtn: React.CSSProperties = { background: "transparent", border: 0, color: "var(--mk-text-secondary)", cursor: "pointer", padding: "6px 8px", fontSize: 15 };
