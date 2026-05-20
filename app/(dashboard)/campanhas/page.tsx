import { NeedsPlatform } from "@/components/shared/NeedsPlatform";
import { PlatformContextBadge } from "@/components/shared/PlatformContextBadge";
import { EmptyState } from "@/components/shared/EmptyState";

export default function CampanhasPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Gestão</div>
        <h1 className="mk-page-title">
          Campanhas
          <PlatformContextBadge />
        </h1>
        <p className="mk-page-sub">
          Todas as campanhas da plataforma ativa.
        </p>
      </div>

      <NeedsPlatform contexto="de campanhas">
        <EmptyState
          icon="ti-speakerphone"
          iconColor="#8B6F47"
          iconBg="rgba(139, 111, 71, 0.15)"
          titulo="Nenhuma campanha sincronizada"
          descricao="Campanhas aparecem aqui automaticamente após o primeiro sync da plataforma conectada."
        />
      </NeedsPlatform>
    </section>
  );
}
