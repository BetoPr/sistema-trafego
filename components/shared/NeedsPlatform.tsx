"use client";

import { usePlatform } from "@/components/providers/PlatformProvider";
import { EmptyState } from "./EmptyState";

interface NeedsPlatformProps {
  children: React.ReactNode;
  /** Texto contextualizado da página, ex: "do dashboard" */
  contexto?: string;
}

export function NeedsPlatform({ children, contexto }: NeedsPlatformProps) {
  const { ativa, conectadas } = usePlatform();

  if (!ativa) {
    const semConexao = conectadas.length === 0;
    return (
      <EmptyState
        icon={semConexao ? "ti-plug-off" : "ti-arrow-up-right"}
        iconColor={semConexao ? "#C97064" : "#C9A876"}
        iconBg={semConexao ? "rgba(201, 112, 100, 0.18)" : "rgba(201, 168, 118, 0.22)"}
        titulo={
          semConexao
            ? "Nenhuma plataforma conectada"
            : "Selecione uma plataforma"
        }
        descricao={
          semConexao
            ? `Conecte Meta Ads ou Google Ads para ver dados ${contexto ?? "aqui"}. Sem integração, nenhuma métrica é exibida.`
            : `Clique no seletor no topo direito para escolher entre as plataformas conectadas.`
        }
        ctaLabel={semConexao ? "Conectar plataforma" : undefined}
        ctaHref={semConexao ? "/integracoes" : undefined}
      />
    );
  }

  return <>{children}</>;
}
