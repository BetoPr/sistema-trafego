const CAMPANHAS = [
  { nome: "Black Friday", cliente: "Bruno Odonto · Meta Ads", iconBg: "linear-gradient(135deg, #6B8E4E, #A8C77F)", status: { cls: "b-green", label: "● Ativa" }, gasto: "R$ 12.400", roas: "4,82x", roasColor: "#6B8E4E", ctr: "3,12%", pct: 92, barGrad: "linear-gradient(90deg, #6B8E4E, #A8C77F)", info: "R$ 12.400 de R$ 13.500 do orçamento" },
  { nome: "Lead Magnet", cliente: "Ana Coach · Meta Ads", iconBg: "linear-gradient(135deg, #8B6F47, #C9A876)", status: { cls: "b-green", label: "● Ativa" }, gasto: "R$ 8.750", roas: "4,15x", roasColor: "#6B8E4E", ctr: "2,84%", pct: 78, barGrad: "linear-gradient(90deg, #8B6F47, #C9A876)", info: "R$ 8.750 de R$ 11.200 do orçamento" },
  { nome: "Catálogo Verão", cliente: "Loja da Maria · Meta Ads", iconBg: "linear-gradient(135deg, #E8A87C, #F0C896)", status: { cls: "b-amber", label: "● Atenção" }, gasto: "R$ 6.200", roas: "3,02x", roasColor: "#8B6916", ctr: "1,76%", pct: 58, barGrad: "linear-gradient(90deg, #E8A87C, #F0C896)", info: "R$ 6.200 de R$ 10.700 do orçamento" },
  { nome: "Retargeting", cliente: "Studio Pilates · Meta Ads", iconBg: "linear-gradient(135deg, #C97064, #E8A87C)", status: { cls: "b-red", label: "● Crítica" }, gasto: "R$ 4.100", roas: "1,48x", roasColor: "#913A2A", ctr: "0,92%", pct: 28, barGrad: "#C97064", info: "R$ 4.100 de R$ 14.500 do orçamento" },
  { nome: "Awareness", cliente: "JL Advocacia · Meta Ads", iconBg: "linear-gradient(135deg, #C9A876, #8B6F47)", status: { cls: "b-green", label: "● Ativa" }, gasto: "R$ 3.480", roas: "3,98x", roasColor: "#6B8E4E", ctr: "2,45%", pct: 65, barGrad: "linear-gradient(90deg, #C9A876, #8B6F47)", info: "R$ 3.480 de R$ 5.350 do orçamento" },
];

export default function CampanhasPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Gestão</div>
        <h1 className="mk-page-title">Campanhas</h1>
        <p className="mk-page-sub">28 campanhas ativas em 12 contas de clientes.</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button className="pill-tab on" type="button">Todas <span style={{ opacity: 0.6, marginLeft: 4 }}>28</span></button>
        <button className="pill-tab" type="button">Ativas <span style={{ opacity: 0.6, marginLeft: 4 }}>19</span></button>
        <button className="pill-tab" type="button">Pausadas <span style={{ opacity: 0.6, marginLeft: 4 }}>7</span></button>
        <div style={{ marginLeft: "auto" }}>
          <button className="ghost-btn" type="button"><i className="ti ti-filter" style={{ fontSize: 14 }} />Filtros</button>
        </div>
      </div>

      <div className="grid-3">
        {CAMPANHAS.map((c) => (
          <div key={c.nome} className="mk-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: c.iconBg }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mk-text)" }}>{c.nome}</div>
                  <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>{c.cliente}</div>
                </div>
              </div>
              <span className={`mk-badge ${c.status.cls}`}>{c.status.label}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "14px 0" }}>
              <div><div className="label-tiny">Gasto</div><div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--mk-text)", marginTop: 3 }}>{c.gasto}</div></div>
              <div><div className="label-tiny">ROAS</div><div style={{ fontSize: 13.5, fontWeight: 600, color: c.roasColor, marginTop: 3 }}>{c.roas}</div></div>
              <div><div className="label-tiny">CTR</div><div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--mk-text)", marginTop: 3 }}>{c.ctr}</div></div>
            </div>
            <div className="mk-progress"><div style={{ background: c.barGrad, width: `${c.pct}%` }} /></div>
            <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 7 }}>{c.info}</div>
          </div>
        ))}

        <div className="mk-card" style={{ background: "transparent", borderStyle: "dashed", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, color: "var(--mk-text-muted)", minHeight: 200, cursor: "pointer" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--mk-surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-plus" style={{ fontSize: 20 }} />
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>Criar campanha</div>
          <div style={{ fontSize: 10.5 }}>Conecte uma conta de anúncios</div>
        </div>
      </div>
    </section>
  );
}
