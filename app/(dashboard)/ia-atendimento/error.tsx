"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function IAAtendimentoError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[ia-atendimento] erro:", error);
  }, [error]);

  return (
    <section className="mk-page">
      <div className="mk-card mk-card-lg" style={{ background: "rgba(201,112,100,0.06)", border: "0.5px solid rgba(201,112,100,0.3)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "#C97064" }}>
          <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} /> Erro ao carregar IA Atendimento
        </h2>
        <p style={{ fontSize: 12.5, color: "var(--mk-text-secondary)", marginBottom: 14 }}>
          Algo deu errado ao montar essa página. Tente recarregar ou volte ao dashboard.
        </p>
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--mk-text-muted)", padding: 10, background: "var(--mk-surface)", borderRadius: 8, marginBottom: 14, wordBreak: "break-all" }}>
          {error.digest || error.message || "erro desconhecido"}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={reset} className="cta-btn"><i className="ti ti-refresh" /> Tentar de novo</button>
          <Link href="/dashboard" className="ghost-btn">Voltar ao dashboard</Link>
        </div>
      </div>
    </section>
  );
}
