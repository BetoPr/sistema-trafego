"use client";

import { useState, useTransition } from "react";
import { sincronizarPagesMeta } from "./_actions";

export function SincronizarPagesBtn({ integracaoId }: { integracaoId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function clicar() {
    setMsg(null);
    start(async () => {
      const r = await sincronizarPagesMeta(integracaoId);
      if (r.ok) setMsg(`✓ ${r.pages} Page(s) sincronizada(s) — webhook leadgen pronto`);
      else setMsg(`Erro: ${r.erro}`);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        onClick={clicar}
        disabled={pending}
        className="ghost-btn"
        style={{ fontSize: 12 }}
      >
        <i className={`ti ${pending ? "ti-loader-2" : "ti-refresh"}`} />
        {pending ? " Sincronizando..." : " Sincronizar Pages do Facebook"}
      </button>
      {msg && (
        <div style={{ fontSize: 11.5, color: msg.startsWith("✓") ? "#10b981" : "#C97064" }}>
          {msg}
        </div>
      )}
    </div>
  );
}
