"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { sincronizarTudoAction } from "@/lib/actions/sync";

interface SyncNowButtonProps {
  variant?: "default" | "compact";
  label?: string;
}

export function SyncNowButton({ variant = "default", label = "Sincronizar agora" }: SyncNowButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const r = await sincronizarTudoAction();
        if (r.total === 0) {
          toast.info("Nenhuma integração ativa pra sincronizar.");
          return;
        }
        if (r.falhas > 0) {
          toast.warning(
            `${r.sucesso}/${r.total} integrações sincronizadas. ${r.falhas} com erro.`,
          );
        } else {
          const totalMetricas = r.resultados.reduce((s, x) => s + x.metricas, 0);
          toast.success(
            `Sync concluído. ${r.sucesso} integração(ões), ${totalMetricas} métrica(s) atualizadas.`,
          );
        }
      } catch (e) {
        toast.error(`Falha no sync: ${(e as Error).message}`);
      }
    });
  }

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid var(--mk-border)",
    background: "var(--mk-surface)",
    color: "var(--mk-text)",
    cursor: pending ? "wait" : "pointer",
    fontSize: variant === "compact" ? 11.5 : 12.5,
    padding: variant === "compact" ? "4px 10px" : "6px 12px",
    borderRadius: 8,
    opacity: pending ? 0.7 : 1,
    transition: "opacity .15s",
  };

  return (
    <button type="button" onClick={handleClick} disabled={pending} style={baseStyle}>
      <i
        className={`ti ${pending ? "ti-loader-2" : "ti-refresh"}`}
        style={{
          fontSize: 13,
          animation: pending ? "spin 0.9s linear infinite" : undefined,
        }}
      />
      {pending ? "Sincronizando..." : label}
    </button>
  );
}
