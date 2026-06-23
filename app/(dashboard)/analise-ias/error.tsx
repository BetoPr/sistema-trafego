"use client";

import { useEffect } from "react";

export default function AnaliseIAsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[analise-ias] error:", error, "digest:", error.digest);
  }, [error]);

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Erro</div>
        <h1 className="mk-page-title">Não consegui carregar a análise</h1>
      </div>
      <div className="mk-card mk-card-lg" style={{ padding: 20, color: "var(--mk-text)" }}>
        <p style={{ marginBottom: 12 }}>Aconteceu um problema ao agregar o uso de IA.</p>
        <pre
          style={{
            background: "var(--mk-bg-deep)",
            border: ".5px solid var(--mk-border)",
            borderRadius: 8,
            padding: 12,
            fontSize: 11.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "var(--mk-icon-pink)",
          }}
        >
          {error.message}
          {error.digest ? `\n\nDigest: ${error.digest}` : ""}
          {error.stack ? `\n\n${error.stack.split("\n").slice(0, 6).join("\n")}` : ""}
        </pre>
        <button
          onClick={reset}
          className="cta-btn"
          style={{ marginTop: 12, padding: "9px 16px", borderRadius: 9, fontSize: 13, fontWeight: 700 }}
        >
          Tentar de novo
        </button>
      </div>
    </section>
  );
}
