import { NeedsPlatform } from "@/components/shared/NeedsPlatform";
import { PlatformContextBadge } from "@/components/shared/PlatformContextBadge";
import { EmptyState } from "@/components/shared/EmptyState";

export default function CriativosPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Análise estratégica</div>
        <h1 className="mk-page-title">
          Criativos & conteúdos
          <PlatformContextBadge />
        </h1>
        <p className="mk-page-sub">
          Ranking automático dos melhores e piores criativos. Identifique o que escalar em segundos.
        </p>
      </div>

      <NeedsPlatform contexto="de criativos">
        <EmptyState
          icon="ti-photo-square-rounded"
          iconColor="#9B7DBF"
          iconBg="rgba(155, 125, 191, 0.18)"
          titulo="Sem criativos para analisar"
          descricao="Após o primeiro sync, criativos aparecem aqui com ranking de CPV, CTR, hook rate e retenção."
        />
      </NeedsPlatform>
    </section>
  );
}
