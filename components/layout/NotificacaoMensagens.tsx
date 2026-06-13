"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Notificação de nova mensagem (estilo WhatsApp Web):
 *  - Notification do navegador quando a aba NÃO está em foco (clica → abre o ticket)
 *  - SOM (beep sintetizado) sempre que chega mensagem do cliente (mesmo com a aba aberta),
 *    a menos que o usuário tenha mutado (localStorage notif_som="off").
 */
export function NotificacaoMensagens({ agenciaId }: { agenciaId: string | null | undefined }) {
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!agenciaId || typeof window === "undefined") return;

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    // AudioContext só pode iniciar após um gesto do usuário — destrava no 1º clique/tecla.
    const destrava = () => {
      try {
        if (!audioRef.current) audioRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        if (audioRef.current.state === "suspended") audioRef.current.resume();
      } catch {}
    };
    window.addEventListener("pointerdown", destrava, { once: true });
    window.addEventListener("keydown", destrava, { once: true });

    function tocarSom() {
      if (localStorage.getItem("notif_som") === "off") return;
      try {
        const ctx = audioRef.current || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioRef.current = ctx;
        if (ctx.state === "suspended") ctx.resume();
        const g = ctx.createGain();
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
        const o1 = ctx.createOscillator(); o1.type = "sine"; o1.frequency.value = 880; o1.connect(g);
        const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = 1175; o2.connect(g);
        o1.start(ctx.currentTime); o1.stop(ctx.currentTime + 0.14);
        o2.start(ctx.currentTime + 0.14); o2.stop(ctx.currentTime + 0.42);
      } catch {}
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

          tocarSom();

          if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
            const corpo = m.tipo === "texto" ? (m.conteudo || "Nova mensagem") : `[${m.tipo || "mídia"}]`;
            try {
              const n = new Notification("Nova mensagem", { body: corpo.slice(0, 140), tag: m.ticket_id });
              n.onclick = () => { window.focus(); if (m.ticket_id) window.location.href = `/atendimentos?t=${m.ticket_id}`; n.close(); };
            } catch {}
          }
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener("pointerdown", destrava);
      window.removeEventListener("keydown", destrava);
      sb.removeChannel(ch);
    };
  }, [agenciaId]);

  return null;
}
