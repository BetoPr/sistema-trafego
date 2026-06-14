"use client";

import { useEffect } from "react";

/**
 * Heartbeat — POST /api/usuarios/heartbeat a cada 30s enquanto a aba está
 * visível. Quando o usuário fecha a aba, manda offline=true via sendBeacon
 * (best effort). Cron do servidor zera quem não bate há > 90s.
 */
export function HeartbeatOnline() {
  useEffect(() => {
    let alive = true;

    function pulse() {
      if (!alive) return;
      if (document.hidden) return;
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
