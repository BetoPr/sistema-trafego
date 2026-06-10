export default function PlanoPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Assinatura</div>
        <h1 className="mk-page-title">Plano Pro</h1>
        <p className="mk-page-sub">Sua assinatura e uso atual.</p>
      </div>

      <div className="meta-card" style={{ marginBottom: 14 }}>
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="mk-badge" style={{ background: "rgba(232,168,124,0.25)", color: "#F0C896", border: "0.5px solid rgba(232,168,124,0.4)" }}>PRO</span>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 10 }}>
              R$ 197 <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.7 }}>/mês</span>
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 4 }}>Próxima cobrança em 28 nov 2025</div>
          </div>
          <button type="button" className="ghost-btn" style={{ color: "#F5EFE4", borderColor: "rgba(245,239,228,0.3)" }}>Mudar plano</button>
        </div>
      </div>

      <div className="grid-3">
        <div className="mk-card">
          <span className="label-tiny">Clientes usados</span>
          <div className="big-num">12 / 20</div>
          <div className="mk-progress" style={{ marginTop: 8 }}>
            <div style={{ background: "linear-gradient(90deg, #8B6F47, #10b981)", width: "60%" }} />
          </div>
        </div>
        <div className="mk-card">
          <span className="label-tiny">Campanhas ativas</span>
          <div className="big-num">28 / ∞</div>
          <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 8 }}>Ilimitado no Pro</div>
        </div>
        <div className="mk-card">
          <span className="label-tiny">Relatórios/mês</span>
          <div className="big-num">28 / 100</div>
          <div className="mk-progress" style={{ marginTop: 8 }}>
            <div style={{ background: "linear-gradient(90deg, #10b981, #34d399)", width: "28%" }} />
          </div>
        </div>
      </div>
    </section>
  );
}
