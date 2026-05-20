import { NeedsPlatform } from "@/components/shared/NeedsPlatform";
import { PlatformContextBadge } from "@/components/shared/PlatformContextBadge";
import { EmptyState } from "@/components/shared/EmptyState";

export default function AlertasPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Monitoramento</div>
        <h1 className="mk-page-title">
          Alertas automáticos
          <PlatformContextBadge />
        </h1>
        <p className="mk-page-sub">Identifique problemas antes de perder dinheiro.</p>
      </div>

      <NeedsPlatform contexto="de alertas">
        <EmptyState
          icon="ti-bell-ringing"
          iconColor="#C97064"
          iconBg="rgba(201, 112, 100, 0.15)"
          titulo="Nenhum alerta disparado"
          descricao="Quando uma campanha sair do padrão (CPL alto, ROAS baixo, fadiga), o alerta aparece aqui."
        />
      </NeedsPlatform>
    </section>
  );
}
