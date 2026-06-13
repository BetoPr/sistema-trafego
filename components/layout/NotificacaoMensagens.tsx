"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Notificação de nova mensagem (estilo WhatsApp Web).
 * Assina INSERT em mensagens (autor=cliente) via realtime e dispara uma
 * Notification do navegador quando a aba não está em foco.
 * Som fica pra um próximo passo.
 */
export function NotificacaoMensagens({ agenciaId }: { agenciaId: string | null | undefined }) {
  useEffect(() => {
    if (!agenciaId || typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const sb = createClient();
    const ch = sb
      .channel("notif-mensagens")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens", filter: "autor=eq.cliente" },
        (payload) => {
          const m = payload.new as { conteudo?: string | null; tipo?: string; ticket_id?: string; agencia_id?: string };
          if (m.agencia_id && m.agencia_id !== agenciaId) return;
          if (Notification.permission !== "granted") return;
          if (!document.hidden) return; // só notifica quando a aba não está em foco

          const corpo = m.tipo === "texto" ? (m.conteudo || "Nova mensagem") : `[${m.tipo || "mídia"}]`;
          try {
            const n = new Notification("Nova mensagem", { body: corpo.slice(0, 140), tag: m.ticket_id });
            n.onclick = () => {
              window.focus();
              if (m.ticket_id) window.location.href = `/atendimentos?t=${m.ticket_id}`;
              n.close();
            };
          } catch {}
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(ch);
    };
  }, [agenciaId]);

  return null;
}
