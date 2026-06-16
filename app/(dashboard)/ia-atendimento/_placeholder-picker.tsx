"use client";

import { useState } from "react";

const PLACEHOLDERS: Array<{ key: string; label: string; exemplo: string }> = [
  { key: "data_hoje", label: "Data de hoje", exemplo: "16/06/2026" },
  { key: "hora_atual", label: "Hora atual", exemplo: "14:32" },
  { key: "dia_semana", label: "Dia da semana", exemplo: "segunda-feira" },
  { key: "periodo_dia", label: "Período do dia", exemplo: "tarde" },
  { key: "data_amanha", label: "Amanhã", exemplo: "17/06/2026" },
  { key: "data_depois_amanha", label: "Depois de amanhã", exemplo: "18/06/2026" },
  { key: "data_proxima_segunda", label: "Próxima segunda", exemplo: "22/06/2026" },
  { key: "data_proxima_terca", label: "Próxima terça", exemplo: "23/06/2026" },
  { key: "data_proxima_quarta", label: "Próxima quarta", exemplo: "17/06/2026" },
  { key: "data_proxima_quinta", label: "Próxima quinta", exemplo: "18/06/2026" },
  { key: "data_proxima_sexta", label: "Próxima sexta", exemplo: "19/06/2026" },
  { key: "data_proximo_sabado", label: "Próximo sábado", exemplo: "20/06/2026" },
  { key: "data_proximo_domingo", label: "Próximo domingo", exemplo: "21/06/2026" },
  { key: "data_iso", label: "Data ISO", exemplo: "2026-06-16" },
  { key: "timestamp_iso", label: "Timestamp UTC", exemplo: "2026-06-16T17:32:00Z" },
  { key: "timezone", label: "Timezone do perfil", exemplo: "America/Sao_Paulo" },
  { key: "nome_cliente", label: "Nome do cliente (placeholder antigo)", exemplo: "Cliente" },
];

export default function PlaceholderPicker() {
  const [aberto, setAberto] = useState(false);

  function inserir(key: string) {
    const ta = document.querySelector<HTMLTextAreaElement>('textarea[name="prompt_sistema"]');
    if (!ta) return;
    const placeholder = key === "nome_cliente" ? "{nome_cliente}" : `{{${key}}}`;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    ta.setRangeText(placeholder, start, end, "end");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    ta.focus();
    setAberto(false);
  }

  return (
    <div style={{ position: "relative", display: "inline-block", marginBottom: 8 }}>
      <button
        type="button"
        className="ghost-btn"
        onClick={() => setAberto((v) => !v)}
        style={{ fontSize: 12, padding: "4px 10px" }}
      >
        <i className="ti ti-calendar-plus" /> Inserir placeholder
      </button>
      {aberto && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 50,
            background: "var(--mk-surface)",
            border: "0.5px solid var(--mk-border)",
            borderRadius: 8,
            padding: 6,
            minWidth: 280,
            maxHeight: 320,
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--mk-text-muted)", padding: "4px 8px" }}>
            Placeholders resolvidos no momento da resposta da IA, usando o timezone do perfil.
          </div>
          {PLACEHOLDERS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => inserir(p.key)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "6px 8px",
                fontSize: 12.5,
                background: "transparent",
                border: 0,
                color: "var(--mk-text)",
                cursor: "pointer",
                borderRadius: 4,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--mk-surface-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ fontWeight: 500 }}>
                {p.key === "nome_cliente" ? "{nome_cliente}" : `{{${p.key}}}`}
              </div>
              <div style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>
                {p.label} — ex: <code>{p.exemplo}</code>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
