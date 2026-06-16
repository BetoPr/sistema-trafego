"use client";

import { useState } from "react";

interface ChipItem {
  id: string;
  nome: string;
  cor?: string;
  iconTabler?: string;
  iconColor?: string;
}

interface Props {
  name: string;
  items: ChipItem[];
  defaultSelected: string[];
}

/**
 * Picker visual de itens (canais/filas/etc) usando chips clicáveis.
 * Mantém state interno + renderiza N inputs hidden com o name pra
 * que o form server-side leia formData.getAll(name).
 */
export function ChipsPicker({ name, items, defaultSelected }: Props) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set(defaultSelected));

  function toggle(id: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  return (
    <>
      {/* Hidden inputs sincronizados com o state */}
      {Array.from(selecionados).map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((it) => {
          const ativo = selecionados.has(it.id);
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => toggle(it.id)}
              style={chip(ativo)}
            >
              {it.iconTabler && <i className={`ti ${it.iconTabler}`} style={{ color: it.iconColor || "currentColor" }} />}
              {it.cor && (
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: it.cor,
                    marginRight: 4,
                  }}
                />
              )}
              {it.nome}
              {ativo && <i className="ti ti-check" style={{ marginLeft: 4, fontSize: 11 }} />}
            </button>
          );
        })}
        {items.length === 0 && (
          <span style={{ fontSize: 11, color: "var(--mk-text-muted)", fontStyle: "italic" }}>Nenhum disponível</span>
        )}
      </div>
    </>
  );
}

function chip(ativo: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11.5,
    padding: "6px 12px",
    borderRadius: 999,
    border: `1px solid ${ativo ? "#10b981" : "var(--mk-border)"}`,
    background: ativo ? "rgba(16,185,129,0.18)" : "var(--mk-surface)",
    color: ativo ? "#10b981" : "var(--mk-text-secondary)",
    cursor: "pointer",
    transition: "all 0.15s",
    fontWeight: ativo ? 600 : 400,
  };
}
