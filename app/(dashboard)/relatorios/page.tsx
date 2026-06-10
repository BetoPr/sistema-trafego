import { NeedsPlatform } from "@/components/shared/NeedsPlatform";
import { PlatformContextBadge } from "@/components/shared/PlatformContextBadge";
import { EmptyState } from "@/components/shared/EmptyState";

export default function RelatoriosPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Compartilhamento</div>
        <h1 className="mk-page-title">
          Relatórios
          <PlatformContextBadge />
        </h1>
        <p className="mk-page-sub">Crie e envie relatórios mensais aos clientes.</p>
      </div>

      <NeedsPlatform contexto="de relatórios">
        <EmptyState
          icon="ti-file-analytics"
          iconColor="#10b981"
          iconBg="rgba(201, 168, 118, 0.18)"
          titulo="Nenhum relatório gerado"
          descricao="Após conectar plataforma e ter dados de pelo menos 7 dias, você pode gerar PDF e Excel."
        />
      </NeedsPlatform>
    </section>
  );
}
