import { NeedsPlatform } from "@/components/shared/NeedsPlatform";
import { PlatformContextBadge } from "@/components/shared/PlatformContextBadge";
import { EmptyState } from "@/components/shared/EmptyState";

export default function FunilPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Jornada de conversão</div>
        <h1 className="mk-page-title">
          Funil de vendas
          <PlatformContextBadge />
        </h1>
        <p className="mk-page-sub">
          Visualize a jornada do anúncio à compra. Identifique gargalos por etapa.
        </p>
      </div>

      <NeedsPlatform contexto="do funil">
        <EmptyState
          icon="ti-filter"
          iconColor="#10b981"
          iconBg="rgba(107, 142, 78, 0.18)"
          titulo="Funil sem dados"
          descricao="Após sync, as etapas (impressões → cliques → visitantes → conversas → leads → vendas) aparecem aqui."
        />
      </NeedsPlatform>
    </section>
  );
}
