"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Mantém /canais auto-atualizado:
 *  1. Polling 10s sempre que houver canal em pending_qr ou connecting
 *     (pra detectar conexão feita fora do sistema, no painel UAZAPI)
 *  2. Realtime listener em canais — atualiza imediatamente se webhook
 *     UAZAPI postar evento `connection`
 */
export function CanaisAutoRefresh({ pollPending }: { pollPending: boolean }) {
  const router = useRouter();

  // Polling
  useEffect(() => {
    if (!pollPending) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 10_000);
    return () => clearInterval(interval);
  }, [pollPending, router]);

  // Realtime
  useEffect(() => {
    const sb = createClient();
    const ch = sb
      .channel("canais-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "canais" },
        () => {
          router.refresh();
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [router]);

  return null;
}
