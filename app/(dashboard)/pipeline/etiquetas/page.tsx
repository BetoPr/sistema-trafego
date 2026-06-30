export default function PipelineEtiquetasPage() {
  return (
    <div style={{ padding: 40, textAlign: "center", background: "var(--mk-surface)", border: "1px dashed var(--mk-border)", borderRadius: 12 }}>
      <i className="ti ti-tag" style={{ fontSize: 36, color: "var(--mk-text-muted)", marginBottom: 12 }} />
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Kanban com Etiquetas — em construção</div>
      <div style={{ fontSize: 12, color: "var(--mk-text-muted)", maxWidth: 480, margin: "0 auto" }}>
        Visão Kanban onde cada coluna é uma etiqueta. Cards = contatos. Espiar · Editar etiqueta · Iniciar Atendimento · buscar · arrastar entre etiquetas. Em breve.
      </div>
    </div>
  );
}
