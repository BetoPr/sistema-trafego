const CLIENTES = [
  { nome: "Bruno Odonto", desc: "Saúde · Recife/PE", iniciais: "BO", bg: "linear-gradient(135deg, #8B6F47, #C9A876)", mrr: "R$ 1.500", roas: "4,82x", roasColor: "#6B8E4E", status: { cls: "b-green", label: "🟢 Excelente" } },
  { nome: "Ana Coach", desc: "Educação · São Paulo/SP", iniciais: "AC", bg: "linear-gradient(135deg, #E8A87C, #F0C896)", mrr: "R$ 1.200", roas: "4,15x", roasColor: "#6B8E4E", status: { cls: "b-green", label: "🟢 Excelente" } },
  { nome: "Loja da Maria", desc: "Moda · Olinda/PE", iniciais: "LM", bg: "linear-gradient(135deg, #C9A876, #E8C896)", mrr: "R$ 990", roas: "3,02x", roasColor: "#8B6916", status: { cls: "b-amber", label: "🟡 Atenção" } },
  { nome: "Studio Pilates", desc: "Fitness · Recife/PE", iniciais: "SP", bg: "linear-gradient(135deg, #C97064, #E8A87C)", mrr: "R$ 780", roas: "1,48x", roasColor: "#913A2A", status: { cls: "b-red", label: "🔴 Problema" } },
  { nome: "JL Advocacia", desc: "Jurídico · Recife/PE", iniciais: "JL", bg: "linear-gradient(135deg, #C9A876, #8B6F47)", mrr: "R$ 2.000", roas: "3,98x", roasColor: "#6B8E4E", status: { cls: "b-green", label: "🟢 Excelente" } },
];

export default function ClientesPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">CRM</div>
        <h1 className="mk-page-title">Clientes</h1>
        <p className="mk-page-sub">12 clientes ativos sob sua gestão.</p>
      </div>

      <div className="grid-3">
        {CLIENTES.map((c) => (
          <div key={c.nome} className="mk-card">
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
              <div className="row-avatar" style={{ width: 44, height: 44, fontSize: 14, background: c.bg }}>{c.iniciais}</div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--mk-text)" }}>{c.nome}</div>
                <div style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>{c.desc}</div>
              </div>
            </div>
            <div style={{ borderTop: "0.5px solid var(--mk-border-soft)", paddingTop: 11, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><div className="label-tiny">MRR</div><div style={{ fontWeight: 600, color: "var(--mk-text)", marginTop: 3, fontSize: 13 }}>{c.mrr}</div></div>
              <div><div className="label-tiny">ROAS</div><div style={{ fontWeight: 600, color: c.roasColor, marginTop: 3, fontSize: 13 }}>{c.roas}</div></div>
            </div>
            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className={`mk-badge ${c.status.cls}`}>{c.status.label}</span>
              <span style={{ fontSize: 11.5, color: "var(--mk-accent)", fontWeight: 600 }}>Abrir →</span>
            </div>
          </div>
        ))}

        <div className="mk-card" style={{ background: "transparent", borderStyle: "dashed", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, color: "var(--mk-text-muted)", minHeight: 180, cursor: "pointer" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--mk-surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-user-plus" style={{ fontSize: 20 }} />
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>Adicionar cliente</div>
          <div style={{ fontSize: 10.5 }}>8 vagas restantes no plano</div>
        </div>
      </div>
    </section>
  );
}
