"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sincronizarPlataformaCanais } from "./_actions";

/**
 * Dispara a detecção de plataforma (iOS/Android/Web) dos canais 1x ao montar,
 * depois do paint (não bloqueia o load da página). Só recarrega se mudou algo.
 * Renderizado apenas quando há canal conectado sem plataforma detectada.
 */
export function DetectarPlataforma() {
  const router = useRouter();
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    sincronizarPlataformaCanais()
      .then((r) => { if (r.ok && r.atualizados > 0) router.refresh(); })
      .catch(() => {});
  }, [router]);
  return null;
}
