import { PageHeader } from "@/components/layout/PageHeader";
import { StubFase } from "@/components/layout/StubFase";

export default function RelatoriosPage() {
  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Geração automática de relatórios em PDF e Excel."
      />
      <StubFase
        fase="Fase 4"
        descricao="Templates de PDF e Excel com KPIs, gráficos e detalhamento por campanha. Histórico de relatórios gerados."
      />
    </>
  );
}
