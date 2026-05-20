import { NeedsPlatform } from "@/components/shared/NeedsPlatform";
import { PlatformContextBadge } from "@/components/shared/PlatformContextBadge";
import { EmptyState } from "@/components/shared/EmptyState";

export default function PublicoPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Audiência</div>
        <h1 className="mk-page-title">
          Análise de público
          <PlatformContextBadge />
        </h1>
        <p className="mk-page-sub">Entenda quem está engajando, comprando e visitando os perfis.</p>
      </div>

      <NeedsPlatform contexto="de público">
        <EmptyState
          icon="ti-users-group"
          iconColor="#5B8BA6"
          iconBg="rgba(91, 139, 166, 0.18)"
          titulo="Sem dados demográficos"
          descricao="Faixa etária, gênero, cidades e dispositivos aparecem aqui depois do primeiro sync."
        />
      </NeedsPlatform>
    </section>
  );
}
