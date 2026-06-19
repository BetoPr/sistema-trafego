"use client";

import { useEffect, useState } from "react";
import { inIframe } from "@/lib/embed";

/**
 * "Inserir" — só aparece quando esta página está aberta como balão flutuante
 * (iframe, dentro do Atendimento). Posta o conteúdo do atalho pra janela-pai,
 * que joga o texto na barra de digitação do chat aberto.
 */
export function InserirAtalhoBtn({ texto }: { texto: string }) {
  const [embed, setEmbed] = useState(false);
  useEffect(() => setEmbed(inIframe()), []);
  if (!embed) return null;
  return (
    <button
      type="button"
      onClick={() => {
        try {
          window.parent.postMessage({ __crm: "inserir-atalho", texto }, window.location.origin);
        } catch {}
      }}
      className="ghost-btn"
      style={{ fontSize: 11, padding: "4px 10px", color: "#9B7DBF", whiteSpace: "nowrap" }}
      title="Inserir na conversa aberta"
    >
      <i className="ti ti-arrow-bar-to-down" /> Inserir
    </button>
  );
}
