export default function PipelineDashboardPage() {
  return (
    <div style={{ padding: 40, textAlign: "center", background: "var(--mk-surface)", border: "1px dashed var(--mk-border)", borderRadius: 12 }}>
      <i className="ti ti-chart-pie" style={{ fontSize: 36, color: "var(--mk-text-muted)", marginBottom: 12 }} />
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Dashboard do Funil — em construção</div>
      <div style={{ fontSize: 12, color: "var(--mk-text-muted)", maxWidth: 480, margin: "0 auto" }}>
        KPIs (Criadas · Abertos · Ganhos · Perdidos · Ticket Médio · Taxa Conv) + gráficos por Status / Etapa / Mês · Valor por Etapa · Por Etiqueta · Por Kanban · Pipelines Ativos. Em breve.
      </div>
    </div>
  );
}
