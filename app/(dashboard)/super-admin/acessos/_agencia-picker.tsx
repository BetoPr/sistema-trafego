"use client";

import { useState } from "react";

interface AgOpt { id: string; nome: string }

const inpStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "0.5px solid var(--mk-border)",
  borderRadius: 8,
  background: "var(--mk-surface-2)",
  color: "var(--mk-text)",
  fontSize: 12.5,
};

export default function AgenciaPicker({ agencias, defaultId }: { agencias: AgOpt[]; defaultId?: string }) {
  const [modo, setModo] = useState<"selecionar" | "nova">("selecionar");
  const [agenciaId, setAgenciaId] = useState(defaultId || "");
  const [novoNome, setNovoNome] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {modo === "selecionar" ? (
        <div style={{ display: "flex", gap: 6 }}>
          <select
            name="agencia_id"
            value={agenciaId}
            onChange={(e) => setAgenciaId(e.target.value)}
            style={{ ...inpStyle, flex: 1 }}
          >
            <option value="">— Selecione —</option>
            {agencias.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <button
            type="button"
            onClick={() => { setModo("nova"); setAgenciaId(""); }}
            className="ghost-btn"
            style={{ fontSize: 11, padding: "6px 10px", whiteSpace: "nowrap" }}
            title="Criar nova agencia"
          >
            <i className="ti ti-plus" /> Nova
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6 }}>
          <input
            name="nova_agencia_nome"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome da nova agencia"
            style={{ ...inpStyle, flex: 1 }}
            autoFocus
            required
          />
          <button
            type="button"
            onClick={() => { setModo("selecionar"); setNovoNome(""); }}
            className="ghost-btn"
            style={{ fontSize: 11, padding: "6px 10px" }}
            title="Voltar pra lista"
          >
            <i className="ti ti-arrow-back-up" />
          </button>
          {/* Hidden mantem agencia_id vazio pra action criar */}
          <input type="hidden" name="agencia_id" value="" />
        </div>
      )}
      {modo === "nova" && (
        <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", fontStyle: "italic" }}>
          <i className="ti ti-info-circle" /> Agencia sera criada junto com o usuario.
        </div>
      )}
    </div>
  );
}
