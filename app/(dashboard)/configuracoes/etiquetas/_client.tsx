"use client";

import { useState } from "react";
import { criarEtiqueta } from "./_actions";

interface Etiqueta {
  id: string;
  nome: string;
  cor: string;
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
  const [editandoCor, setEditandoCor] = useState<string | null>(null);

  async function adicionar() {
    const n = nome.trim();
    if (!n) return;
    setCriando(true);
    try {
      const r = await criarEtiqueta(n, cor);
      if (r.ok && r.id) {
        setLista((l) => [...l, { id: r.id!, nome: n, cor }].sort((a, b) => a.nome.localeCompare(b.nome)));
        setNome("");
      } else {
        alert(r.msg || "Falha ao criar.");
      }
    } finally {
      setCriando(false);
    }
  }

  async function patch(id: string, body: { nome?: string; cor?: string }) {
    const r = await fetch(`/api/etiquetas/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(`Falha: ${j.error || r.statusText}`);
      return false;
    }
    return true;
  }

  async function mudarCor(id: string, novaCor: string) {
    setLista((l) => l.map((e) => (e.id === id ? { ...e, cor: novaCor } : e)));
    setEditandoCor(null);
    await patch(id, { cor: novaCor });
  }

  async function renomear(e: Etiqueta) {
    const novo = prompt("Renomear etiqueta:", e.nome);
    if (!novo || !novo.trim() || novo.trim() === e.nome) return;
    if (await patch(e.id, { nome: novo.trim() })) {
      setLista((l) => l.map((x) => (x.id === e.id ? { ...x, nome: novo.trim() } : x)).sort((a, b) => a.nome.localeCompare(b.nome)));
    }
  }

  async function excluir(e: Etiqueta) {
    if (!confirm(`Excluir a etiqueta "${e.nome}"? Vai remover de todos os contatos.`)) return;
    const r = await fetch(`/api/etiquetas/${e.id}`, { method: "DELETE" });
    if (r.ok) setLista((l) => l.filter((x) => x.id !== e.id));
    else alert("Falha ao excluir.");
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
        {/* Preview */}
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
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderBottom: "0.5px solid var(--mk-border-soft, var(--mk-border))" }}>
                {/* swatch clicável pra trocar cor */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setEditandoCor(editandoCor === e.id ? null : e.id)}
                    title="Mudar cor"
                    style={{ width: 22, height: 22, borderRadius: 6, background: e.cor, border: "1.5px solid rgba(255,255,255,0.25)", cursor: "pointer", flexShrink: 0 }}
                  />
                  {editandoCor === e.id && (
                    <div style={{ position: "absolute", top: 28, left: 0, zIndex: 20, background: "var(--mk-bg)", border: "0.5px solid var(--mk-border)", borderRadius: 10, padding: 10, boxShadow: "0 12px 30px rgba(0,0,0,0.4)", width: 184 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 8 }}>
                        {PALETA.map((c) => (
                          <button key={c} onClick={() => mudarCor(e.id, c)} style={{ width: 26, height: 26, borderRadius: 6, background: c, border: c === e.cor ? "2px solid #fff" : "1px solid rgba(255,255,255,0.2)", cursor: "pointer" }} />
                        ))}
                      </div>
                      <label style={{ fontSize: 10.5, color: "var(--mk-text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                        Personalizada
                        <input type="color" value={e.cor} onChange={(ev) => mudarCor(e.id, ev.target.value)} style={{ width: 28, height: 24, padding: 0, border: 0, background: "transparent", cursor: "pointer" }} />
                      </label>
                    </div>
                  )}
                </div>

                <Badge nome={e.nome} cor={e.cor} />
                <div style={{ flex: 1 }} />
                <button onClick={() => renomear(e)} title="Renomear" style={iconBtn}><i className="ti ti-pencil" /></button>
                <button onClick={() => excluir(e)} title="Excluir" style={{ ...iconBtn, color: "#f43f5e" }}><i className="ti ti-trash" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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

const iconBtn: React.CSSProperties = { background: "transparent", border: 0, color: "var(--mk-text-secondary)", cursor: "pointer", padding: "6px 8px", fontSize: 15 };
