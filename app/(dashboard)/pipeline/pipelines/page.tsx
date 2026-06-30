export default function PipelinesPage() {
  return (
    <div style={{ padding: 40, textAlign: "center", background: "var(--mk-surface)", border: "1px dashed var(--mk-border)", borderRadius: 12 }}>
      <i className="ti ti-route" style={{ fontSize: 36, color: "var(--mk-text-muted)", marginBottom: 12 }} />
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Pipelines (Funis) — em construção</div>
      <div style={{ fontSize: 12, color: "var(--mk-text-muted)", maxWidth: 480, margin: "0 auto" }}>
        CRUD de funis. Cada pipeline tem etapas (cor, notificar fila, notificar atendente). Em breve.
      </div>
    </div>
  );
}
