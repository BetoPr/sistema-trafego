"use client";

interface LogItem { data: string; usuario: string; tarefa: string; provider: string; modelo: string; tokens: number; custo: number; status: string }

/** Export do log de uso: CSV (client) + PDF (rota /api/ia/uso/pdf) pra mandar pro Claude analisar. */
export function ExportarUso({ provider, dias, log }: { provider: string; dias: number; log: LogItem[] }) {
  function csv() {
    const head = ["Data", "Usuario", "Sessao", "Provedor", "Modelo", "Tokens", "Custo USD", "Status"];
    const linhas = log.map((l) => [
      new Date(l.data).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      l.usuario, l.tarefa, l.provider, l.modelo, String(l.tokens), l.custo.toFixed(6), l.status,
    ]);
    const txt = [head, ...linhas].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + txt], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `uso-ia-${provider}-${dias}d.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={csv} className="ghost-btn" style={{ fontSize: 12 }} disabled={log.length === 0}>
        <i className="ti ti-file-spreadsheet" /> CSV
      </button>
      <a
        href={`/api/ia/uso/pdf?provider=${provider}&dias=${dias}`}
        target="_blank"
        rel="noreferrer"
        className="cta-btn"
        style={{ fontSize: 12, textDecoration: "none", pointerEvents: log.length === 0 ? "none" : "auto", opacity: log.length === 0 ? 0.5 : 1 }}
      >
        <i className="ti ti-file-type-pdf" /> Exportar PDF
      </a>
    </div>
  );
}
