"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarEtiquetaPerfil, deletarEtiquetaPerfil } from "./_actions";

interface EtiquetaOpt {
  id: string;
  nome: string;
  cor: string;
}

interface PerfilEtiqueta {
  etiqueta_id: string;
  descricao_uso: string;
  ordem: number;
  nome: string;
  cor: string;
}

interface Props {
  perfilId: string;
  todasEtiquetas: EtiquetaOpt[];
  configuradas: PerfilEtiqueta[];
}

const row: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  padding: 10,
  border: "0.5px solid var(--mk-border)",
  borderRadius: 8,
  background: "var(--mk-surface-2)",
  marginBottom: 8,
};

const badge = (cor: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 10px",
  borderRadius: 999,
  background: cor,
  color: "#fff",
  fontSize: 11,
  fontWeight: 600,
  whiteSpace: "nowrap",
  minWidth: 80,
  justifyContent: "center",
});

const ta: React.CSSProperties = {
  flex: 1,
  minHeight: 48,
  padding: 8,
  border: "0.5px solid var(--mk-border)",
  borderRadius: 6,
  background: "var(--mk-surface)",
  color: "var(--mk-text)",
  fontSize: 12,
  fontFamily: "inherit",
  resize: "vertical",
};

const ghostBtn: React.CSSProperties = {
  padding: "6px 10px",
  border: "0.5px solid var(--mk-border)",
  borderRadius: 6,
  background: "transparent",
  color: "var(--mk-text)",
  cursor: "pointer",
  fontSize: 12,
};

export default function PerfilEtiquetasEditor({ perfilId, todasEtiquetas, configuradas }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [novaSelecao, setNovaSelecao] = useState<string>("");
  const [rascunhos, setRascunhos] = useState<Record<string, string>>(
    Object.fromEntries(configuradas.map((c) => [c.etiqueta_id, c.descricao_uso])),
  );

  const disponiveis = todasEtiquetas.filter(
    (e) => !configuradas.some((c) => c.etiqueta_id === e.id),
  );

  async function adicionar() {
    if (!novaSelecao) return;
    const fd = new FormData();
    fd.set("perfil_id", perfilId);
    fd.set("etiqueta_id", novaSelecao);
    fd.set("descricao_uso", "");
    fd.set("ordem", String(configuradas.length));
    startTransition(async () => {
      await salvarEtiquetaPerfil(fd);
      setNovaSelecao("");
      router.refresh();
    });
  }

  async function salvarDescricao(etiquetaId: string) {
    const fd = new FormData();
    fd.set("perfil_id", perfilId);
    fd.set("etiqueta_id", etiquetaId);
    fd.set("descricao_uso", rascunhos[etiquetaId] ?? "");
    const cfg = configuradas.find((c) => c.etiqueta_id === etiquetaId);
    fd.set("ordem", String(cfg?.ordem ?? 0));
    startTransition(async () => {
      await salvarEtiquetaPerfil(fd);
      router.refresh();
    });
  }

  async function remover(etiquetaId: string) {
    const fd = new FormData();
    fd.set("perfil_id", perfilId);
    fd.set("etiqueta_id", etiquetaId);
    startTransition(async () => {
      await deletarEtiquetaPerfil(fd);
      router.refresh();
    });
  }

  return (
    <div>
      {configuradas.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--mk-text-muted)", padding: "8px 0", fontStyle: "italic" }}>
          Nenhuma etiqueta configurada. A IA não vai aplicar etiquetas até você adicionar pelo menos uma.
        </div>
      )}

      {configuradas.map((c) => (
        <div key={c.etiqueta_id} style={row}>
          <span style={badge(c.cor)}>{c.nome}</span>
          <textarea
            style={ta}
            placeholder="Quando a IA deve aplicar essa etiqueta? Ex: cliente pediu orçamento, demonstrou interesse forte..."
            value={rascunhos[c.etiqueta_id] ?? ""}
            onChange={(e) => setRascunhos((prev) => ({ ...prev, [c.etiqueta_id]: e.target.value }))}
            onBlur={() => {
              if ((rascunhos[c.etiqueta_id] ?? "") !== c.descricao_uso) salvarDescricao(c.etiqueta_id);
            }}
            disabled={pending}
          />
          <button type="button" onClick={() => remover(c.etiqueta_id)} style={ghostBtn} title="Remover" disabled={pending}>
            <i className="ti ti-trash" />
          </button>
        </div>
      ))}

      {disponiveis.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <select
            value={novaSelecao}
            onChange={(e) => setNovaSelecao(e.target.value)}
            style={{
              flex: 1,
              padding: 8,
              border: "0.5px solid var(--mk-border)",
              borderRadius: 6,
              background: "var(--mk-surface)",
              color: "var(--mk-text)",
              fontSize: 12,
            }}
            disabled={pending}
          >
            <option value="">+ Adicionar etiqueta...</option>
            {disponiveis.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
          <button type="button" onClick={adicionar} style={ghostBtn} disabled={!novaSelecao || pending}>
            <i className="ti ti-plus" /> Adicionar
          </button>
        </div>
      )}

      {disponiveis.length === 0 && configuradas.length > 0 && (
        <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 8 }}>
          Todas as etiquetas existentes já estão configuradas. Crie novas em Configurações → Etiquetas.
        </div>
      )}
    </div>
  );
}
