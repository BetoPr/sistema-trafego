"use client";

import { useState } from "react";

const PLACEHOLDERS: Array<{ key: string; label: string; exemplo: string }> = [
  { key: "nome_cliente", label: "Nome do cliente", exemplo: "João" },
  { key: "data_hoje", label: "Data de hoje", exemplo: "16/06/2026" },
  { key: "hora_atual", label: "Hora atual", exemplo: "14:32" },
  { key: "dia_semana", label: "Dia da semana", exemplo: "segunda-feira" },
  { key: "periodo_dia", label: "Período do dia", exemplo: "tarde" },
  { key: "data_amanha", label: "Amanhã", exemplo: "17/06/2026" },
  { key: "data_depois_amanha", label: "Depois de amanhã", exemplo: "18/06/2026" },
  { key: "data_proxima_segunda", label: "Próxima segunda", exemplo: "22/06/2026" },
  { key: "data_proxima_sexta", label: "Próxima sexta", exemplo: "19/06/2026" },
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
        <>
          <div
            onClick={() => setAberto(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999,
              background: "transparent",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              zIndex: 1000,
              background: "#1a1d1c",
              border: "1px solid rgba(155,125,191,0.4)",
              borderRadius: 10,
              padding: 6,
              minWidth: 280,
              maxHeight: 360,
              overflowY: "auto",
              boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ fontSize: 10.5, color: "#9aa69e", padding: "6px 8px", borderBottom: "0.5px solid rgba(255,255,255,0.06)", marginBottom: 4 }}>
              Resolvido no momento da resposta. Usa timezone do perfil.
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
                  padding: "8px 10px",
                  fontSize: 12.5,
                  background: "transparent",
                  border: 0,
                  color: "#f2f5f4",
                  cursor: "pointer",
                  borderRadius: 6,
                  marginBottom: 2,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(155,125,191,0.12)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 12 }}>
                  {p.key === "nome_cliente" ? "{nome_cliente}" : `{{${p.key}}}`}
                </div>
                <div style={{ fontSize: 10.5, color: "#9aa69e", marginTop: 2 }}>
                  {p.label} — ex: <code style={{ color: "#9B7DBF" }}>{p.exemplo}</code>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
