const ALERTAS = [
  { border: "#C97064", iconBg: "rgba(201,112,100,0.18)", iconColor: "#C97064", icon: "ti-trending-down", titulo: "CPL aumentou 35% — Studio Pilates", desc: "CPL saltou de R$ 22 para R$ 29,70 em 48h. Verifique criativos saturados.", quando: "há 2 horas", btn1: "Abrir campanha" },
  { border: "#C97064", iconBg: "rgba(201,112,100,0.18)", iconColor: "#C97064", icon: "ti-alert-octagon", titulo: "Frequência acima de 4 — Promo Pilates", desc: "Criativo está com frequência 5,8. Público saturado. Hora de trocar.", quando: "há 3 horas", btn1: "Pausar criativo" },
  { border: "#C9A876", iconBg: "rgba(201,168,118,0.22)", iconColor: "#8B6916", icon: "ti-chart-bar-off", titulo: "CPM disparou 22% — Awareness JL", desc: "CPM passou de R$ 18 para R$ 22. Concorrência no leilão pode estar subindo.", quando: "há 8 horas", btn1: "Analisar" },
  { border: "#C9A876", iconBg: "rgba(201,168,118,0.22)", iconColor: "#8B6916", icon: "ti-currency-dollar", titulo: "Orçamento perto do limite — Loja da Maria", desc: "Catálogo Verão atingiu 58% do orçamento. Ritmo previsto: 96%.", quando: "há 5 horas", btn1: "Ajustar orçamento" },
  { border: "#6B8E4E", iconBg: "rgba(107,142,78,0.2)", iconColor: "#6B8E4E", icon: "ti-trophy", titulo: "Novo recorde de ROAS — Bruno Odonto", desc: "Black Friday atingiu 4,82x — melhor dos últimos 90 dias. Vale escalar verba.", quando: "há 1 dia", btn1: "Escalar verba", btn2: "Marcar lido" },
];

export default function AlertasPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Monitoramento</div>
        <h1 className="mk-page-title">Alertas automáticos</h1>
        <p className="mk-page-sub">5 alertas ativos pedem sua atenção. Identifique problemas antes de perder dinheiro.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {ALERTAS.map((a, i) => (
          <div key={i} className="mk-card" style={{ borderLeft: `3px solid ${a.border}` }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: a.iconBg, color: a.iconColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${a.icon}`} style={{ fontSize: 19 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--mk-text)" }}>{a.titulo}</div>
                    <div style={{ fontSize: 11.5, color: "var(--mk-text-secondary)", marginTop: 4, lineHeight: 1.5 }}>{a.desc}</div>
                  </div>
                  <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)", whiteSpace: "nowrap", marginLeft: 12 }}>{a.quando}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                  <button className="ghost-btn" type="button">{a.btn1}</button>
                  <button className="ghost-btn" type="button" style={{ color: "var(--mk-text-muted)" }}>{a.btn2 ?? "Silenciar"}</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
