import { requireUserWithAgencia } from "@/lib/auth";
import { NeedsPlatform } from "@/components/shared/NeedsPlatform";
import { PlatformContextBadge } from "@/components/shared/PlatformContextBadge";
import { DashboardEmptyMetrics } from "./_components/DashboardEmptyMetrics";

export default async function DashboardPage() {
  const { usuario } = await requireUserWithAgencia();
  const primeiroNome = usuario.nome.split(" ")[0];

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Painel da agência</div>
        <h1 className="mk-page-title">
          Bom dia, {primeiroNome}.
          <PlatformContextBadge />
        </h1>
        <p className="mk-page-sub">
          Visão consolidada por plataforma. Conecte ao menos uma integração para começar.
        </p>
      </div>

      <NeedsPlatform contexto="no dashboard">
        <DashboardEmptyMetrics />
      </NeedsPlatform>
    </section>
  );
}
