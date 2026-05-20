import { PageHeader } from "@/components/layout/PageHeader";
import { StubFase } from "@/components/layout/StubFase";

export default function CampanhasPage() {
  return (
    <>
      <PageHeader
        title="Campanhas"
        description="Todas as campanhas dos seus clientes em um lugar."
      />
      <StubFase
        fase="Fase 3"
        descricao="Tabela unificada de campanhas com filtros por cliente, status e período. Sincroniza com Meta Ads."
      />
    </>
  );
}
