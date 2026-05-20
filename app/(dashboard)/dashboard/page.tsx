import { PageHeader } from "@/components/layout/PageHeader";
import { StubFase } from "@/components/layout/StubFase";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral dos KPIs consolidados dos seus clientes."
      />
      <StubFase
        fase="Fase 3"
        descricao="Cards de KPIs, gráficos de gasto × receita, top campanhas e anúncios. Depende de Meta Ads conectado (Fase 2)."
      />
    </>
  );
}
