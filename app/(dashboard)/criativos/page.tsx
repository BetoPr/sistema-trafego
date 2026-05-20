const CRIATIVOS = [
  { nome: "Reel Preto Elegante", meta: "Loja da Maria · Reels · há 6 dias", thumb: "linear-gradient(135deg, #2A2418 0%, #5C3B22 50%, #8B6F47 100%)", icon: "ti-player-play-filled", medalBg: "linear-gradient(135deg, #6B8E4E, #A8C77F)", medalColor: "#1F2A12", medalIcon: "ti-trophy", medalLabel: "#1 do mês", cpv: "R$ 0,32", cpvColor: "#6B8E4E", c1: "CTR", c1v: "4,8%", c2: "Retenção", c2v: "72%" },
  { nome: "Bastidores da Loja", meta: "Loja da Maria · Reels · há 4 dias", thumb: "linear-gradient(135deg, #8B6F47 0%, #C9A876 60%, #E8C896 100%)", icon: "ti-player-play-filled", medalBg: "linear-gradient(135deg, #6B8E4E, #A8C77F)", medalColor: "#1F2A12", medalIcon: "ti-flame", medalLabel: "Escalando", cpv: "R$ 0,41", cpvColor: "#6B8E4E", c1: "CTR", c1v: "3,9%", c2: "Retenção", c2v: "65%" },
  { nome: "Provador Feminino", meta: "Loja da Maria · Carrossel · há 3 dias", thumb: "linear-gradient(135deg, #E8A87C 0%, #F0C896 50%, #C9A876 100%)", icon: "ti-photo", medalBg: "linear-gradient(135deg, #6B8E4E, #A8C77F)", medalColor: "#1F2A12", medalIcon: "ti-flame", medalLabel: "Escalando", cpv: "R$ 0,52", cpvColor: "#6B8E4E", c1: "CTR", c1v: "3,2%", c2: "Retenção", c2v: "58%" },
  { nome: "Antes & Depois", meta: "Bruno Odonto · Reels · há 2 dias", thumb: "linear-gradient(135deg, #5C3B22 0%, #8B6F47 60%, #C9A876 100%)", icon: "ti-player-play-filled", medalBg: "linear-gradient(135deg, #6B8E4E, #A8C77F)", medalColor: "#1F2A12", medalIcon: "ti-flame", medalLabel: "Escalando", cpv: "R$ 0,58", cpvColor: "#6B8E4E", c1: "CTR", c1v: "3,1%", c2: "Retenção", c2v: "61%" },
  { nome: "Curso Express — Ana", meta: "Ana Coach · Reels · há 18 dias", thumb: "linear-gradient(135deg, #C9A876 0%, #E8C896 100%)", icon: "ti-player-play-filled", medalBg: "linear-gradient(135deg, #C9A876, #E8C896)", medalColor: "#5A4810", medalIcon: "ti-alert-triangle", medalLabel: "Saturando", cpv: "R$ 1,18", cpvColor: "#8B6916", c1: "CTR", c1v: "1,4%", c2: "Freq.", c2v: "4,2", c2Color: "#8B6916" },
  { nome: "Promo Pilates 50% off", meta: "Studio Pilates · Imagem · há 24 dias", thumb: "linear-gradient(135deg, #C97064 0%, #E8A87C 100%)", icon: "ti-photo", medalBg: "linear-gradient(135deg, #C97064, #E8B5AC)", medalColor: "#5A1F18", medalIcon: "ti-skull", medalLabel: "Pausar", cpv: "R$ 1,87", cpvColor: "#913A2A", c1: "CTR", c1v: "0,8%", c1Color: "#913A2A", c2: "Freq.", c2v: "5,8", c2Color: "#913A2A" },
];

export default function CriativosPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Análise estratégica</div>
        <h1 className="mk-page-title">Criativos & conteúdos</h1>
        <p className="mk-page-sub">Ranking automático dos melhores e piores criativos. Identifique o que escalar em segundos.</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button className="pill-tab on" type="button"><i className="ti ti-flame" style={{ fontSize: 13, verticalAlign: -2, marginRight: 3 }} />Escalando <span style={{ opacity: 0.6, marginLeft: 4 }}>8</span></button>
        <button className="pill-tab" type="button"><i className="ti ti-trophy" style={{ fontSize: 13, verticalAlign: -2, marginRight: 3 }} />Melhores</button>
        <button className="pill-tab" type="button"><i className="ti ti-alert-triangle" style={{ fontSize: 13, verticalAlign: -2, marginRight: 3 }} />Saturando <span style={{ opacity: 0.6, marginLeft: 4 }}>3</span></button>
        <button className="pill-tab" type="button"><i className="ti ti-skull" style={{ fontSize: 13, verticalAlign: -2, marginRight: 3 }} />Pausar <span style={{ opacity: 0.6, marginLeft: 4 }}>2</span></button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="ghost-btn" type="button"><i className="ti ti-filter" style={{ fontSize: 13 }} />Filtros</button>
          <button className="ghost-btn" type="button"><i className="ti ti-arrows-sort" style={{ fontSize: 13 }} />CPV ↑</button>
        </div>
      </div>

      <div className="grid-4">
        <div className="mk-card"><span className="label-tiny">CPV médio</span><div className="big-num">R$ 0,48</div><div className="delta-up"><i className="ti ti-arrow-down-right" style={{ fontSize: 12 }} />−R$ 0,12</div></div>
        <div className="mk-card"><span className="label-tiny">Hook rate médio</span><div className="big-num">68%</div><div className="delta-up"><i className="ti ti-arrow-up-right" style={{ fontSize: 12 }} />+4 pp</div></div>
        <div className="mk-card"><span className="label-tiny">Retenção 3s</span><div className="big-num">42%</div><div className="delta-up"><i className="ti ti-arrow-up-right" style={{ fontSize: 12 }} />+2 pp</div></div>
        <div className="mk-card"><span className="label-tiny">Criativos ativos</span><div className="big-num">38</div><div style={{ fontSize: 11, marginTop: 5, color: "var(--mk-text-muted)" }}>8 escalando · 3 saturando</div></div>
      </div>

      <div className="grid-3">
        {CRIATIVOS.map((c) => (
          <div key={c.nome} className="creative-card">
            <div className="creative-thumb" style={{ background: c.thumb }}>
              <i className={`ti ${c.icon}`} style={{ fontSize: 36, color: "rgba(255,253,248,0.85)" }} />
              <div className="creative-medal" style={{ background: c.medalBg, color: c.medalColor }}>
                <i className={`ti ${c.medalIcon}`} /> {c.medalLabel}
              </div>
            </div>
            <div className="creative-name">{c.nome}</div>
            <div className="creative-meta">{c.meta}</div>
            <div className="creative-stats">
              <div><div className="creative-stat-label">CPV</div><div className="creative-stat-value" style={{ color: c.cpvColor }}>{c.cpv}</div></div>
              <div><div className="creative-stat-label">{c.c1}</div><div className="creative-stat-value" style={{ color: c.c1Color }}>{c.c1v}</div></div>
              <div><div className="creative-stat-label">{c.c2}</div><div className="creative-stat-value" style={{ color: c.c2Color }}>{c.c2v}</div></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-3">
        <div className="mk-card mk-card-lg">
          <h3 className="card-title" style={{ marginBottom: 4 }}>Tipo de conteúdo</h3>
          <p className="card-sub" style={{ marginBottom: 14 }}>O que mais funciona</p>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg viewBox="0 0 100 100" width="110" height="110">
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--mk-surface-2)" strokeWidth="14" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#8B6F47" strokeWidth="14" strokeDasharray="171.9 238.7" transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#C9A876" strokeWidth="14" strokeDasharray="38.2 300.8" strokeDashoffset="-171.9" transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#E8A87C" strokeWidth="14" strokeDasharray="28.6 310.4" strokeDashoffset="-210.1" transform="rotate(-90 50 50)" />
              <text x="50" y="48" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="Poppins" fill="var(--mk-text)">72%</text>
              <text x="50" y="60" textAnchor="middle" fontSize="6" fontFamily="Poppins" fill="var(--mk-text-muted)">Reels</text>
            </svg>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, fontSize: 11.5 }}>
              {[{ c: "#8B6F47", l: "Reels", v: "72%" }, { c: "#C9A876", l: "Carrossel", v: "16%" }, { c: "#E8A87C", l: "Imagem", v: "12%" }].map((x) => (
                <div key={x.l} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--mk-text-secondary)" }}><span style={{ width: 8, height: 8, background: x.c, borderRadius: 2 }} />{x.l}</span>
                  <span style={{ fontWeight: 600, color: "var(--mk-text)" }}>{x.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mk-card mk-card-lg">
          <h3 className="card-title" style={{ marginBottom: 4 }}>Visitas por idade</h3>
          <p className="card-sub" style={{ marginBottom: 14 }}>Quem visita o perfil</p>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg viewBox="0 0 100 100" width="110" height="110">
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--mk-surface-2)" strokeWidth="14" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#9B7DBF" strokeWidth="14" strokeDasharray="114.6 238.7" transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#C9A8E8" strokeWidth="14" strokeDasharray="64.5 274.5" strokeDashoffset="-114.6" transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#5B8BA6" strokeWidth="14" strokeDasharray="35.8 303.2" strokeDashoffset="-179.1" transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#8AB8D4" strokeWidth="14" strokeDasharray="23.9 315.1" strokeDashoffset="-214.9" transform="rotate(-90 50 50)" />
              <text x="50" y="48" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="Poppins" fill="var(--mk-text)">48%</text>
              <text x="50" y="60" textAnchor="middle" fontSize="6" fontFamily="Poppins" fill="var(--mk-text-muted)">25-34</text>
            </svg>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
              {[{ c: "#9B7DBF", l: "25-34", v: "48%" }, { c: "#C9A8E8", l: "35-44", v: "27%" }, { c: "#5B8BA6", l: "18-24", v: "15%" }, { c: "#8AB8D4", l: "45+", v: "10%" }].map((x) => (
                <div key={x.l} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--mk-text-secondary)" }}><span style={{ width: 8, height: 8, background: x.c, borderRadius: 2 }} />{x.l}</span>
                  <span style={{ fontWeight: 600, color: "var(--mk-text)" }}>{x.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mk-card mk-card-lg">
          <h3 className="card-title" style={{ marginBottom: 4 }}>Melhor horário</h3>
          <p className="card-sub" style={{ marginBottom: 14 }}>Quando converte mais</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: "ti-sun", iconColor: "#C9A876", label: "19h - 22h", value: "R$ 0,38", valueColor: "#6B8E4E", pct: 92, grad: "linear-gradient(90deg, #6B8E4E, #A8C77F)" },
              { icon: "ti-moon", iconColor: "#8B6F47", label: "22h - 00h", value: "R$ 0,48", valueColor: "#6B8E4E", pct: 76, grad: "linear-gradient(90deg, #8B6F47, #C9A876)" },
              { icon: "ti-coffee", iconColor: "#E8A87C", label: "12h - 14h", value: "R$ 0,82", valueColor: "#8B6916", pct: 52, grad: "linear-gradient(90deg, #E8A87C, #F0C896)" },
              { icon: "ti-sunset", iconColor: "#C97064", label: "06h - 09h", value: "R$ 1,42", valueColor: "#913A2A", pct: 24, grad: "#C97064" },
            ].map((h) => (
              <div key={h.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 5 }}>
                  <span style={{ color: "var(--mk-text)" }}>
                    <i className={`ti ${h.icon}`} style={{ fontSize: 13, verticalAlign: -2, marginRight: 4, color: h.iconColor }} />{h.label}
                  </span>
                  <span style={{ fontWeight: 600, color: h.valueColor }}>{h.value}</span>
                </div>
                <div className="mk-progress"><div style={{ background: h.grad, width: `${h.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
