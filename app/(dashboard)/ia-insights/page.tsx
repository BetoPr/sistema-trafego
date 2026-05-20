export default function IaInsightsPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Em breve</div>
        <h1 className="mk-page-title">Insights com IA</h1>
        <p className="mk-page-sub">Recomendações automáticas baseadas no seu histórico.</p>
      </div>

      <div className="mk-card mk-card-lg" style={{ textAlign: "center", padding: "60px 30px", background: "linear-gradient(135deg, var(--mk-surface) 0%, var(--mk-surface-2) 100%)" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #9B7DBF, #C9A8E8)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFDF8", margin: "0 auto 16px" }}>
          <i className="ti ti-brain" style={{ fontSize: 38 }} />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--mk-text)", marginBottom: 8 }}>Em breve</h3>
        <p style={{ fontSize: 13, color: "var(--mk-text-secondary)", maxWidth: 480, margin: "0 auto 20px", lineHeight: 1.6 }}>
          A IA vai analisar seus dados e sugerir: quais criativos escalar, quando trocar de público, onde cortar verba e prever resultados.
        </p>
        <button type="button" className="cta-btn" style={{ margin: "0 auto" }}>
          <i className="ti ti-bell" style={{ fontSize: 14 }} />Avise quando lançar
        </button>
      </div>
    </section>
  );
}
