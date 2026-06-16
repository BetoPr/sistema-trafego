"use client";

import { useState, useTransition } from "react";
import { toggleFerramentaIA } from "./_actions";

/**
 * Toggle inline pra ativar/desativar ferramenta IA sem reload.
 * useTransition + estado otimista (UI vira na hora, reverte se action falhar).
 */
export function FerramentaToggle({ id, ativo: ativoServidor }: { id: string; ativo: boolean }) {
  const [ativo, setAtivo] = useState(ativoServidor);
  const [pending, start] = useTransition();

  function clicar() {
    const novo = !ativo;
    setAtivo(novo);
    start(async () => {
      const r = await toggleFerramentaIA(id, novo);
      if (!r.ok) setAtivo(!novo);
    });
  }

  return (
    <button
      type="button"
      onClick={clicar}
      disabled={pending}
      className={`toggle-switch ${ativo ? "is-on" : ""}`}
      aria-pressed={ativo}
      title={ativo ? "Desativar" : "Ativar"}
    >
      <span className="toggle-knob" />
    </button>
  );
}
