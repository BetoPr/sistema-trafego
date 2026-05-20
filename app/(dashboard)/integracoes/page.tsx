const INTEGRACOES = [
  { nome: "Meta Ads", desc: "12 contas sincronizadas.", icon: "ti-brand-meta", iconBg: "linear-gradient(135deg, #1877F2, #4FB1F0)", status: { cls: "b-green", label: "● Conectado" }, ctaLabel: "Gerenciar", ctaPrimary: false },
  { nome: "Google Ads", desc: "Search, Display, YouTube.", icon: "ti-brand-google", iconBg: "linear-gradient(135deg, #4285F4, #34A853)", status: { cls: "b-amber", label: "● Disponível" }, ctaLabel: "Conectar", ctaPrimary: true },
  { nome: "TikTok Ads", desc: "TikTok for Business.", icon: "ti-brand-tiktok", iconBg: "linear-gradient(135deg, #2A2418, #5C3B22)", status: { cls: "b-amber", label: "● Disponível" }, ctaLabel: "Conectar", ctaPrimary: true },
  { nome: "WhatsApp Business", desc: "Notificações em tempo real.", icon: "ti-brand-whatsapp", iconBg: "linear-gradient(135deg, #25D366, #128C7E)", status: { cls: "b-green", label: "● Conectado" }, ctaLabel: "Gerenciar", ctaPrimary: false },
  { nome: "Mailchimp", desc: "Sincronize leads com listas.", icon: "ti-mail", iconBg: "linear-gradient(135deg, #E8A87C, #C38D6A)", status: { cls: "b-amber", label: "● Disponível" }, ctaLabel: "Conectar", ctaPrimary: true },
  { nome: "Google Analytics 4", desc: "8 propriedades sincronizadas.", icon: "ti-chart-pie", iconBg: "linear-gradient(135deg, #C9A876, #E8A87C)", status: { cls: "b-green", label: "● Conectado" }, ctaLabel: "Gerenciar", ctaPrimary: false },
];

export default function IntegracoesPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Conexões</div>
        <h1 className="mk-page-title">Integrações</h1>
        <p className="mk-page-sub">Conecte plataformas de anúncios e ferramentas.</p>
      </div>

      <div className="grid-3">
        {INTEGRACOES.map((i) => (
          <div key={i.nome} className="mk-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 13 }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: i.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFDF8" }}>
                <i className={`ti ${i.icon}`} style={{ fontSize: 24 }} />
              </div>
              <span className={`mk-badge ${i.status.cls}`}>{i.status.label}</span>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--mk-text)" }}>{i.nome}</div>
            <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginTop: 3 }}>{i.desc}</div>
            <button
              type="button"
              className="ghost-btn"
              style={{
                marginTop: 12,
                width: "100%",
                justifyContent: "center",
                color: i.ctaPrimary ? "var(--mk-text)" : undefined,
                borderColor: i.ctaPrimary ? "var(--mk-text)" : undefined,
              }}
            >
              {i.ctaLabel}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
