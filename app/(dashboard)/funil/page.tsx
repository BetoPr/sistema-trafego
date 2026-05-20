const ETAPAS = [
  { icon: "ti-eye", nome: "Impressões", desc: "Pessoas que viram o anúncio", width: 92, valor: "438.520", info: "100% do alcance", big: "438k", small: "CPM R$ 12,84", grad: "linear-gradient(135deg, #8B6F47, #C9A876)" },
  { icon: "ti-click", nome: "Cliques", desc: "Engajaram com o anúncio", width: 72, valor: "11.480", info: "CTR 2,62%", big: "11.480", small: "CPC R$ 4,16", grad: "linear-gradient(135deg, #A88A5F, #D4AC7E)" },
  { icon: "ti-device-desktop", nome: "Visitantes", desc: "Chegaram na landing page", width: 58, valor: "9.846", info: "85,8% dos cliques", big: "9.846", small: "Bounce 38%", grad: "linear-gradient(135deg, #C9A876, #E8C896)" },
  { icon: "ti-message-circle", nome: "Conversas", desc: "Iniciaram contato", width: 44, valor: "3.842", info: "39% dos visitantes", big: "3.842", small: "Custo R$ 12,44", grad: "linear-gradient(135deg, #D4AC7E, #E8A87C)" },
  { icon: "ti-user-plus", nome: "Leads qualificados", desc: "Prontos para compra", width: 28, valor: "1.842", info: "48% das conversas", big: "1.842", small: "CPQL R$ 25,96", grad: "linear-gradient(135deg, #E8A87C, #F0C896)" },
  { icon: "ti-shopping-cart", nome: "Vendas", desc: "Compra concluída", width: 14, valor: "1.247", info: "67,7% qualificados", big: "1.247", small: "CPA R$ 38,35", grad: "linear-gradient(135deg, #6B8E4E, #A8C77F)" },
];

export default function FunilPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Jornada de conversão</div>
        <h1 className="mk-page-title">Funil de vendas</h1>
        <p className="mk-page-sub">Visualize a jornada do anúncio à compra. Identifique gargalos por etapa.</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        <button className="pill-tab on" type="button">Todos os clientes</button>
        <button className="pill-tab" type="button">Bruno Odonto</button>
        <button className="pill-tab" type="button">Ana Coach</button>
        <button className="pill-tab" type="button">Loja da Maria</button>
      </div>

      <div className="grid-4">
        <Kpi label="Taxa de conversão" value="2,84%" delta="+0,4 pp" />
        <Kpi label="CPL" value="R$ 18,42" delta="−R$ 3,20" down />
        <Kpi label="Ticket médio" value="R$ 147,82" delta="+R$ 12,40" />
        <Kpi label="Tempo médio" value="4,2 dias" delta="+0,6 dia" negative />
      </div>

      <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
        <div style={{ marginBottom: 20 }}>
          <h3 className="card-title">Etapas do funil</h3>
          <p className="card-sub">Volume e conversão de cada estágio · últimos 30 dias</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ETAPAS.map((e) => (
            <div key={e.nome} className="funnel-row">
              <div className="funnel-side">
                <div className="stage-name">
                  <i className={`ti ${e.icon}`} style={{ fontSize: 14, marginRight: 5, verticalAlign: -2 }} />
                  {e.nome}
                </div>
                <div className="stage-desc">{e.desc}</div>
              </div>
              <div className="funnel-visual">
                <div className="funnel-stage" style={{ width: `${e.width}%`, background: e.grad }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{e.valor}</div>
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{e.info}</div>
                </div>
              </div>
              <div className="funnel-metrics">
                <div className="big">{e.big}</div>
                <div className="small">{e.small}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2-3">
        <div className="mk-card mk-card-lg">
          <h3 className="card-title" style={{ marginBottom: 4 }}>Gargalos identificados</h3>
          <p className="card-sub" style={{ marginBottom: 14 }}>Etapas com maior perda relativa</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Gargalo border="#C97064" titulo="Visitantes → Conversas" badge="−61%" badgeCls="b-red" desc="6.004 pessoas saem sem iniciar contato. Revise o CTA e a oferta." />
            <Gargalo border="#C9A876" titulo="Impressões → Cliques" badge="−97,4%" badgeCls="b-amber" desc="CTR baixo em 4 criativos. Teste headlines mais diretas." />
            <Gargalo border="#6B8E4E" titulo="Qualificados → Vendas" badge="−32%" badgeCls="b-green" desc="Conversão saudável. Mantenha follow-up em 48h." />
          </div>
        </div>

        <div className="mk-card mk-card-lg">
          <h3 className="card-title" style={{ marginBottom: 14 }}>Origem dos leads</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <OrigemRow icon="ti-brand-instagram" label="Instagram Feed" pct={42} grad="linear-gradient(90deg, #E8A87C, #C38D6A)" />
            <OrigemRow icon="ti-brand-facebook" label="Facebook Feed" pct={28} grad="linear-gradient(90deg, #8B6F47, #C9A876)" />
            <OrigemRow icon="ti-photo" label="Stories" pct={18} grad="linear-gradient(90deg, #C9A876, #E8C896)" />
            <OrigemRow icon="ti-device-mobile" label="Reels" pct={12} grad="linear-gradient(90deg, #6B8E4E, #A8C77F)" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Kpi({ label, value, delta, down, negative }: { label: string; value: string; delta: string; down?: boolean; negative?: boolean }) {
  return (
    <div className="mk-card">
      <span className="label-tiny">{label}</span>
      <div className="big-num">{value}</div>
      <div className={negative ? "delta-down" : "delta-up"}>
        <i className={`ti ${down ? "ti-arrow-down-right" : "ti-arrow-up-right"}`} style={{ fontSize: 12 }} />{delta}
      </div>
    </div>
  );
}

function Gargalo({ border, titulo, badge, badgeCls, desc }: { border: string; titulo: string; badge: string; badgeCls: string; desc: string }) {
  return (
    <div style={{ background: "var(--mk-surface-2)", borderRadius: 10, padding: 12, borderLeft: `3px solid ${border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--mk-text)" }}>{titulo}</div>
        <span className={`mk-badge ${badgeCls}`}>{badge}</span>
      </div>
      <div style={{ fontSize: 11, color: "var(--mk-text-secondary)", lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

function OrigemRow({ icon, label, pct, grad }: { icon: string; label: string; pct: number; grad: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
        <span style={{ color: "var(--mk-text)" }}>
          <i className={`ti ${icon}`} style={{ fontSize: 14, verticalAlign: -2, marginRight: 5 }} />{label}
        </span>
        <span style={{ color: "var(--mk-text-secondary)", fontWeight: 600 }}>{pct}%</span>
      </div>
      <div className="mk-progress"><div style={{ background: grad, width: `${pct}%` }} /></div>
    </div>
  );
}
