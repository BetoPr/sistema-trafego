"use client";

import { useEffect, useRef } from "react";
import { avisarAbaAlterada } from "./_crm-overlays";

/**
 * Dispara 1x o aviso global "aba X alterada" quando `ativo` (ex: a página
 * recarregou com ?ok=... após salvar/excluir). O toast aparece no topo e lembra
 * de atualizar Atendimentos (que carrega os dados dessa aba uma vez no load).
 */
export function AvisaAlteracao({ aba, ativo }: { aba: string; ativo: boolean }) {
  const fired = useRef(false);
  useEffect(() => {
    if (ativo && !fired.current) { fired.current = true; avisarAbaAlterada(aba); }
  }, [ativo, aba]);
  return null;
}
