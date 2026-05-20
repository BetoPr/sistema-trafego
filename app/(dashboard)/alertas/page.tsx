import { PageHeader } from "@/components/layout/PageHeader";
import { StubFase } from "@/components/layout/StubFase";

export default function AlertasPage() {
  return (
    <>
      <PageHeader
        title="Alertas"
        description="Regras de monitoramento e histórico de disparos."
      />
      <StubFase
        fase="Fase 5"
        descricao="Engine de regras (CPA alto, ROAS baixo, sem gasto, fadiga). Notificação na sino do topo."
      />
    </>
  );
}
