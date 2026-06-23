"use client";

import { useState } from "react";

export function TestarApiBtn({ perfilId }: { perfilId: string }) {
  const [rodando, setRodando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; resposta?: string; erro?: string; latencia_ms?: number; tokens_in?: number; tokens_out?: number; modelo?: string } | null>(null);

  async function testar() {
    setRodando(true);
    setResultado(null);
    try {
      // Pega chave do input se digitada (sem precisar salvar primeiro)
      const apiInput = document.querySelector<HTMLInputElement>('input[name="api_key"]');
      const apiKeyOverride = (apiInput?.value || "").trim();
      const r = await fetch("/api/ia-atendimento/testar-perfil", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ perfilId, apiKeyOverride: apiKeyOverride || undefined }),
      });
      const j = await r.json();
      setResultado(j);
    } catch (e) {
      setResultado({ ok: false, erro: e instanceof Error ? e.message : String(e) });
    }
    setRodando(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
      <button
        type="button"
        onClick={testar}
        disabled={rodando}
        className="ghost-btn"
        style={{ fontSize: 12, alignSelf: "flex-start", borderColor: "#9B7DBF", color: "#9B7DBF" }}
      >
        <i className={`ti ${rodando ? "ti-loader-2" : "ti-flask"}`} style={rodando ? { animation: "spin 1s linear infinite", display: "inline-block" } : undefined} />
        {rodando ? " Testando…" : " Testar chave API agora"}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {resultado && (
        <div style={{ padding: "8px 12px", borderRadius: 6, fontSize: 11.5, background: resultado.ok ? "rgba(16,185,129,0.10)" : "rgba(201,112,100,0.12)", border: `0.5px solid ${resultado.ok ? "#00E19A" : "#C97064"}`, color: resultado.ok ? "#00E19A" : "#C97064" }}>
          {resultado.ok ? (
            <>
              <strong>✓ Chave OK</strong> · {resultado.modelo} · {resultado.latencia_ms}ms · {resultado.tokens_in}↓ / {resultado.tokens_out}↑ tokens
              <div style={{ marginTop: 4, color: "var(--mk-text-secondary)", fontStyle: "italic" }}>
                IA respondeu: &quot;{resultado.resposta}&quot;
              </div>
            </>
          ) : (
            <>
              <strong>✗ Falha</strong> · {resultado.latencia_ms}ms
              <div style={{ marginTop: 4, fontFamily: "monospace", wordBreak: "break-all" }}>{resultado.erro}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
