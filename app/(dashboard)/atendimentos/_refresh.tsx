"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Mantém /atendimentos atualizado:
 *  1. Realtime: ouve INSERT/UPDATE em tickets e mensagens.
 *     Quando webhook UAZAPI cria/atualiza ticket, page atualiza sozinha.
 *  2. Polling 15s como fallback (caso realtime falhe).
 */
export function AtendimentosRefresh() {
  const router = useRouter();

  useEffect(() => {
    const sb = createClient();
    const ch = sb
      .channel("atendimentos-lista")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
        router.refresh();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens" }, () => {
        router.refresh();
      })
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [router]);

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(t);
  }, [router]);

  return null;
}
