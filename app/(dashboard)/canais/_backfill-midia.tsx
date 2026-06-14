"use client";

import { useEffect, useState } from "react";

/**
 * Botão "Re-baixar mídias pendentes" — chama /api/admin/backfill-midia em lotes
 * até zerar (ou até falhar 2x seguidas).
 *
 * Mostra contagem live: "12 pendentes · re-baixar".
 */
export function BackfillMidiaBtn() {
  const [pendentes, setPendentes] = useState<number | null>(null);
  const [rodando, setRodando] = useState(false);
  const [progresso, setProgresso] = useState<string | null>(null);

  async function carregarContagem() {
    try {
      const r = await fetch("/api/admin/backfill-midia");
      const j = await r.json();
      setPendentes(j.pendentes ?? 0);
    } catch {
      setPendentes(null);
    }
  }

  useEffect(() => { void carregarContagem(); }, []);

  async function rodar() {
    if (rodando) return;
    setRodando(true);
    setProgresso("Buscando mídias pendentes…");
    let totalSucesso = 0;
    let totalFalha = 0;
    let falhasSeguidas = 0;
    while (true) {
      try {
        const r = await fetch("/api/admin/backfill-midia?limit=30", { method: "POST" });
        const j = await r.json();
        if (!r.ok) {
          setProgresso(`Erro: ${j.error || r.statusText}`);
          break;
        }
        totalSucesso += j.sucesso || 0;
        totalFalha += j.falha || 0;
        setPendentes(j.restantes ?? 0);
        setProgresso(`✅ ${totalSucesso} baixadas · ⚠️ ${totalFalha} falhas · ${j.restantes ?? 0} restantes`);
        if (j.processed === 0) break;
        if (j.sucesso === 0) {
          falhasSeguidas++;
          if (falhasSeguidas >= 2) {
            setProgresso(`Parou — ${totalFalha} mensagens não baixaram (UAZAPI sem dado pra elas).`);
            break;
          }
        } else {
          falhasSeguidas = 0;
        }
      } catch (e) {
        setProgresso(`Erro: ${e instanceof Error ? e.message : String(e)}`);
        break;
      }
    }
    setRodando(false);
    void carregarContagem();
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        onClick={rodar}
        disabled={rodando || pendentes === 0}
        className="ghost-btn"
        style={{ fontSize: 11.5, opacity: pendentes === 0 ? 0.5 : 1 }}
        title={pendentes === 0 ? "Sem pendências" : "Tenta re-baixar mídias que falharam"}
      >
        <i className={`ti ${rodando ? "ti-loader" : "ti-download"}`} />
        {rodando ? "Baixando…" : pendentes === null ? "Mídias pendentes" : `${pendentes} mídias pendentes · re-baixar`}
      </button>
      {progresso && (
        <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>{progresso}</span>
      )}
    </div>
  );
}
