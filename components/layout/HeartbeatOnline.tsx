"use client";

import { useEffect } from "react";
import { inIframe } from "@/lib/embed";

/**
 * Heartbeat — POST /api/usuarios/heartbeat a cada 30s enquanto a aba está
 * visível. Quando o usuário fecha a aba, manda offline=true via sendBeacon
 * (best effort). Cron do servidor zera quem não bate há > 90s.
 */
export function HeartbeatOnline() {
  useEffect(() => {
    if (inIframe()) return; // dentro do balão flutuante não duplica heartbeat
    let alive = true;

    function pulse() {
      if (!alive) return;
      // bate mesmo com a aba em background — usuário continua "logado" no CRM
      // mesmo enquanto vê outra aba. Cron derruba só se passar > 90s sem ping
      // (ex: máquina desligada, browser fechado, sem internet).
      fetch("/api/usuarios/heartbeat", { method: "POST" }).catch(() => {});
    }

    pulse(); // bate imediato no mount
    const iv = setInterval(pulse, 30000);

    const handleVisibility = () => { if (!document.hidden) pulse(); };
    document.addEventListener("visibilitychange", handleVisibility);

    const handleUnload = () => {
      try {
        const blob = new Blob([JSON.stringify({ offline: true })], { type: "application/json" });
        navigator.sendBeacon("/api/usuarios/heartbeat", blob);
      } catch {}
    };
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      alive = false;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, []);

  return null;
}
