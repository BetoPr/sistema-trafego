import { requireUserWithAgencia } from "@/lib/auth";

const clientesMock = [
  { id: "bo", nome: "Bruno Odonto", segmento: "Saúde · Recife/PE", iniciais: "BO", bg: "linear-gradient(135deg, #8B6F47, #C9A876)", investido: "R$ 12.400", faturado: "R$ 59.768", roas: "4,82x", roasColor: "#6B8E4E", crescimento: "+28%", growthColor: "#6B8E4E", status: { label: "🟢 Excelente", cls: "b-green" } },
  { id: "ac", nome: "Ana Coach", segmento: "Educação · São Paulo/SP", iniciais: "AC", bg: "linear-gradient(135deg, #E8A87C, #F0C896)", investido: "R$ 8.750", faturado: "R$ 36.312", roas: "4,15x", roasColor: "#6B8E4E", crescimento: "+18%", growthColor: "#6B8E4E", status: { label: "🟢 Excelente", cls: "b-green" } },
  { id: "lm", nome: "Loja da Maria", segmento: "Moda · Olinda/PE", iniciais: "LM", bg: "linear-gradient(135deg, #C9A876, #E8C896)", investido: "R$ 6.200", faturado: "R$ 18.724", roas: "3,02x", roasColor: "#8B6916", crescimento: "+4%", growthColor: "#8B6916", status: { label: "🟡 Atenção", cls: "b-amber" } },
  { id: "sp", nome: "Studio Pilates", segmento: "Fitness · Recife/PE", iniciais: "SP", bg: "linear-gradient(135deg, #C97064, #E8A87C)", investido: "R$ 4.100", faturado: "R$ 6.068", roas: "1,48x", roasColor: "#913A2A", crescimento: "−12%", growthColor: "#913A2A", status: { label: "🔴 Problema", cls: "b-red" } },
  { id: "jl", nome: "JL Advocacia", segmento: "Jurídico · Recife/PE", iniciais: "JL", bg: "linear-gradient(135deg, #C9A876, #8B6F47)", investido: "R$ 3.480", faturado: "R$ 13.850", roas: "3,98x", roasColor: "#6B8E4E", crescimento: "+9%", growthColor: "#6B8E4E", status: { label: "🟢 Excelente", cls: "b-green" } },
];

export default async function DashboardPage() {
  const { usuario } = await requireUserWithAgencia();
  const primeiroNome = usuario.nome.split(" ")[0];

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Painel da agência</div>
        <h1 className="mk-page-title">Bom dia, {primeiroNome}.</h1>
        <p className="mk-page-sub">
          12 clientes ativos · 28 campanhas rodando · faltam 12 dias para fechar o mês.
        </p>
      </div>

      {/* META DO MÊS */}
      <div className="meta-card" style={{ marginBottom: 14 }}>
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <div className="label-tiny-w" style={{ color: "rgba(255,253,248,0.75)" }}>
              Meta de faturamento gerado · Novembro
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
              <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.8px" }}>R$ 218.000</span>
              <span style={{ fontSize: 13, opacity: 0.65 }}>de R$ 300.000</span>
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.8, marginTop: 2 }}>
              72,7% atingido · faltam R$ 82.000 em 12 dias
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Ritmo necessário</div>
            <div style={{ fontSize: 17, fontWeight: 600, marginTop: 4 }}>R$ 6.833/dia</div>
            <div style={{ fontSize: 10.5, opacity: 0.65, marginTop: 2 }}>Atual: R$ 6.418/dia</div>
          </div>
        </div>
        <div className="meta-progress-bar">
          <div className="meta-progress-fill" style={{ width: "72.7%" }} />
        </div>
      </div>

      {/* 8 KPIs */}
      <div className="grid-4">
        <div className="kpi-dark">
          <div className="blob" />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="label-tiny-w">Investido</span>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(255,253,248,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-currency-dollar" style={{ fontSize: 14 }} />
              </div>
            </div>
            <div className="big-num-w">R$ 47.820</div>
            <div className="delta-up delta-up-warm">
              <i className="ti ti-arrow-up-right" style={{ fontSize: 12 }} />+12,4%
            </div>
          </div>
        </div>
        <KpiCard label="Faturamento" value="R$ 184.350" delta="+28,7%" iconColor="#4D6B2F" iconBg="#E1EBD5" icon="ti-coins" />
        <KpiCard label="ROAS médio" value="3,86x" delta="+0,42" iconColor="#8B6F47" iconBg="#F0E4CD" icon="ti-target-arrow" />
        <KpiCard label="Leads" value="2.594" delta="+18,2%" iconColor="#2F5670" iconBg="#D9E5EE" icon="ti-user-plus" />
      </div>

      <div className="grid-4">
        <KpiCard label="CPL médio" value="R$ 18,42" delta="−R$ 3,20" arrowDown iconColor="#604380" iconBg="#E5DCEE" icon="ti-cash" />
        <KpiCard label="CAC médio" value="R$ 38,35" delta="−R$ 5,10" arrowDown iconColor="#8B6F47" iconBg="#F0E4CD" icon="ti-receipt" />
        <KpiCard label="Conversões" value="1.247" delta="−3,1%" negativeDelta iconColor="#913A2A" iconBg="#F5D9D2" icon="ti-shopping-cart" />
        <div className="mk-card">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="label-tiny">Campanhas ativas</span>
            <div className="icon-pill" style={{ background: "#E1EBD5", color: "#4D6B2F" }}>
              <i className="ti ti-flame" style={{ fontSize: 14 }} />
            </div>
          </div>
          <div className="big-num">28</div>
          <div style={{ fontSize: 11, marginTop: 5, color: "var(--mk-text-muted)" }}>
            19 ativas · 7 pausadas · 2 finalizadas
          </div>
        </div>
      </div>

      {/* DESTAQUES */}
      <div className="grid-3">
        <DestaqueCard
          color="#6B8E4E"
          bg="linear-gradient(135deg, #6B8E4E, #A8C77F)"
          icon="ti-trophy"
          label="Melhor campanha"
          labelColor="#6B8E4E"
          titulo="Black Friday — Bruno Odonto"
          sub="ROAS 4,82x · R$ 59.768 gerados"
        />
        <DestaqueCard
          color="#C9A876"
          bg="linear-gradient(135deg, #C9A876, #E8C896)"
          icon="ti-flame"
          label="Melhor criativo"
          labelColor="#8B6F47"
          titulo="Reel Preto Elegante"
          sub="R$ 0,32 por visita · CTR 4,8%"
        />
        <DestaqueCard
          color="#C97064"
          bg="linear-gradient(135deg, #C97064, #E8B5AC)"
          icon="ti-skull"
          label="Pior campanha"
          labelColor="#913A2A"
          titulo="Retarget — Studio Pilates"
          sub="ROAS 1,48x · vazando verba"
        />
      </div>

      {/* GASTO X FATURAMENTO */}
      <div className="grid-2-3">
        <div className="mk-card mk-card-lg">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h3 className="card-title">Gasto × Faturamento</h3>
              <p className="card-sub">Evolução das últimas 4 semanas</p>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--mk-text-secondary)" }}>
                <span style={{ width: 9, height: 9, background: "#C38D6A", borderRadius: 2 }} />Gasto
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--mk-text-secondary)" }}>
                <span style={{ width: 9, height: 9, background: "#6B8E4E", borderRadius: 2 }} />Faturamento
              </span>
            </div>
          </div>
          <svg viewBox="0 0 460 180" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: 180, display: "block" }}>
            <defs>
              <linearGradient id="rg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6B8E4E" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#6B8E4E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#C38D6A" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#C38D6A" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="rl" x1="0%" x2="100%">
                <stop offset="0%" stopColor="#6B8E4E" />
                <stop offset="100%" stopColor="#A8C77F" />
              </linearGradient>
            </defs>
            <line x1="40" y1="155" x2="450" y2="155" stroke="var(--mk-border-soft)" strokeWidth="0.5" />
            <line x1="40" y1="105" x2="450" y2="105" stroke="var(--mk-border-soft)" strokeWidth="0.5" strokeDasharray="2,3" />
            <line x1="40" y1="55" x2="450" y2="55" stroke="var(--mk-border-soft)" strokeWidth="0.5" strokeDasharray="2,3" />
            <text x="34" y="59" textAnchor="end" fontSize="10" fontFamily="Poppins" fill="currentColor" opacity={0.5}>60k</text>
            <text x="34" y="109" textAnchor="end" fontSize="10" fontFamily="Poppins" fill="currentColor" opacity={0.5}>30k</text>
            <text x="34" y="159" textAnchor="end" fontSize="10" fontFamily="Poppins" fill="currentColor" opacity={0.5}>0</text>
            <path d="M 50 130 Q 100 115 150 105 T 250 80 T 350 60 T 445 38 L 445 155 L 50 155 Z" fill="url(#rg)" />
            <path d="M 50 130 Q 100 115 150 105 T 250 80 T 350 60 T 445 38" fill="none" stroke="url(#rl)" strokeWidth={2.5} />
            <path d="M 50 142 Q 100 137 150 133 T 250 122 T 350 113 T 445 105 L 445 155 L 50 155 Z" fill="url(#gg)" />
            <path d="M 50 142 Q 100 137 150 133 T 250 122 T 350 113 T 445 105" fill="none" stroke="#C38D6A" strokeWidth={2} />
            <circle cx="445" cy="38" r="4.5" fill="var(--mk-surface)" stroke="#6B8E4E" strokeWidth={2} />
            <circle cx="445" cy="105" r="3.5" fill="var(--mk-surface)" stroke="#C38D6A" strokeWidth={2} />
            <text x="50" y="172" textAnchor="middle" fontSize="10" fontFamily="Poppins" fill="currentColor" opacity={0.5}>Sem 1</text>
            <text x="150" y="172" textAnchor="middle" fontSize="10" fontFamily="Poppins" fill="currentColor" opacity={0.5}>Sem 2</text>
            <text x="250" y="172" textAnchor="middle" fontSize="10" fontFamily="Poppins" fill="currentColor" opacity={0.5}>Sem 3</text>
            <text x="350" y="172" textAnchor="middle" fontSize="10" fontFamily="Poppins" fill="currentColor" opacity={0.5}>Sem 4</text>
            <text x="445" y="172" textAnchor="middle" fontSize="10" fontFamily="Poppins" fill="currentColor" fontWeight={600}>Hoje</text>
          </svg>
        </div>

        <div className="mk-card mk-card-lg">
          <h3 className="card-title" style={{ marginBottom: 14 }}>Top campanhas</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <ProgressRow label="Black Friday — Bruno" value="4,82x" valueColor="#6B8E4E" pct={92} gradient="linear-gradient(90deg, #6B8E4E, #A8C77F)" />
            <ProgressRow label="Lead Mag. — Ana Coach" value="4,15x" valueColor="#6B8E4E" pct={78} gradient="linear-gradient(90deg, #8B6F47, #C9A876)" />
            <ProgressRow label="Catálogo — Loja Maria" value="3,02x" valueColor="#8B6916" pct={58} gradient="linear-gradient(90deg, #E8A87C, #F0C896)" />
            <ProgressRow label="Retarget — Pilates" value="1,48x" valueColor="#913A2A" pct={28} gradient="#C97064" />
          </div>
        </div>
      </div>

      {/* PIZZAS */}
      <div className="grid-3">
        <DonutCard
          title="Faixa etária"
          subtitle="Quem mais compra"
          centerValue="42%"
          centerLabel="25-34"
          segments={[
            { color: "#8B6F47", dash: "100.3 238.7", offset: 0 },
            { color: "#C9A876", dash: "66.8 272.2", offset: -100.3 },
            { color: "#E8A87C", dash: "35.8 303.2", offset: -167.1 },
            { color: "#A88A5F", dash: "23.9 315.1", offset: -202.9 },
            { color: "#D4AC7E", dash: "11.9 327.1", offset: -226.8 },
          ]}
          legend={[
            { color: "#8B6F47", label: "25-34", value: "42%" },
            { color: "#C9A876", label: "35-44", value: "28%" },
            { color: "#E8A87C", label: "18-24", value: "15%" },
            { color: "#A88A5F", label: "45-54", value: "10%" },
            { color: "#D4AC7E", label: "55+", value: "5%" },
          ]}
        />

        <div className="mk-card mk-card-lg">
          <h3 className="card-title" style={{ marginBottom: 4 }}>Gênero</h3>
          <p className="card-sub" style={{ marginBottom: 14 }}>Distribuição do público</p>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg viewBox="0 0 100 100" width="110" height="110">
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--mk-surface-2)" strokeWidth="14" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#C97064" strokeWidth="14" strokeDasharray="162.4 238.7" transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#5B8BA6" strokeWidth="14" strokeDasharray="76.4 238.7" strokeDashoffset="-162.4" transform="rotate(-90 50 50)" />
              <text x="50" y="48" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="Poppins" fill="var(--mk-text)">68%</text>
              <text x="50" y="60" textAnchor="middle" fontSize="6" fontFamily="Poppins" fill="var(--mk-text-muted)">Feminino</text>
            </svg>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, fontSize: 11.5 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--mk-text-secondary)" }}>
                    <span style={{ width: 8, height: 8, background: "#C97064", borderRadius: 2 }} />Feminino
                  </span>
                  <span style={{ fontWeight: 600, color: "var(--mk-text)" }}>68%</span>
                </div>
                <div className="mk-progress"><div style={{ background: "linear-gradient(90deg, #C97064, #E8B5AC)", width: "68%" }} /></div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--mk-text-secondary)" }}>
                    <span style={{ width: 8, height: 8, background: "#5B8BA6", borderRadius: 2 }} />Masculino
                  </span>
                  <span style={{ fontWeight: 600, color: "var(--mk-text)" }}>32%</span>
                </div>
                <div className="mk-progress"><div style={{ background: "linear-gradient(90deg, #5B8BA6, #8AB8D4)", width: "32%" }} /></div>
              </div>
            </div>
          </div>
        </div>

        <DonutCard
          title="Posicionamento"
          subtitle="Onde mais converte"
          centerValue="48%"
          centerLabel="Reels"
          segments={[
            { color: "#9B7DBF", dash: "114.6 238.7", offset: 0 },
            { color: "#C9A8E8", dash: "66.8 272.2", offset: -114.6 },
            { color: "#6B8E4E", dash: "38.2 300.8", offset: -181.4 },
            { color: "#A8C77F", dash: "19.1 319.9", offset: -219.6 },
          ]}
          legend={[
            { color: "#9B7DBF", label: "Reels", value: "48%" },
            { color: "#C9A8E8", label: "Feed", value: "28%" },
            { color: "#6B8E4E", label: "Stories", value: "16%" },
            { color: "#A8C77F", label: "Explorar", value: "8%" },
          ]}
        />
      </div>

      {/* CIDADES + DISPOSITIVO */}
      <div className="grid-2">
        <div className="mk-card mk-card-lg">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h3 className="card-title">Top cidades</h3>
              <p className="card-sub">Onde os clientes estão comprando</p>
            </div>
            <button type="button" className="ghost-btn">
              <i className="ti ti-map-pin" style={{ fontSize: 13 }} />Ver mapa
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { cidade: "São Paulo, SP", pct: 42, grad: "linear-gradient(90deg, #8B6F47, #C9A876)" },
              { cidade: "Recife, PE", pct: 22, grad: "linear-gradient(90deg, #C9A876, #E8C896)" },
              { cidade: "Campo Grande, MS", pct: 18, grad: "linear-gradient(90deg, #E8A87C, #F0C896)" },
              { cidade: "Brasília, DF", pct: 12, grad: "linear-gradient(90deg, #6B8E4E, #A8C77F)" },
              { cidade: "Outras", pct: 6, grad: "var(--mk-text-muted)" },
            ].map((c) => (
              <div key={c.cidade}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: "var(--mk-text)", fontWeight: 500 }}>{c.cidade}</span>
                  <span style={{ color: "var(--mk-text-secondary)", fontWeight: 600 }}>{c.pct}%</span>
                </div>
                <div className="mk-progress mk-progress-lg"><div style={{ background: c.grad, width: `${c.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="mk-card mk-card-lg">
          <h3 className="card-title" style={{ marginBottom: 4 }}>Dispositivo</h3>
          <p className="card-sub" style={{ marginBottom: 16 }}>Perfil do público premium</p>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <svg viewBox="0 0 100 100" width="120" height="120">
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--mk-surface-2)" strokeWidth="14" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#8B6F47" strokeWidth="14" strokeDasharray="148.0 238.7" transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#6B8E4E" strokeWidth="14" strokeDasharray="71.6 267.4" strokeDashoffset="-148.0" transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#5B8BA6" strokeWidth="14" strokeDasharray="19.1 319.9" strokeDashoffset="-219.6" transform="rotate(-90 50 50)" />
              <text x="50" y="48" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="Poppins" fill="var(--mk-text)">62%</text>
              <text x="50" y="60" textAnchor="middle" fontSize="6" fontFamily="Poppins" fill="var(--mk-text-muted)">iPhone</text>
            </svg>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { icon: "ti-brand-apple", iconColor: "#8B6F47", label: "iPhone", sub: "Ticket médio R$ 184", pct: "62%" },
                { icon: "ti-brand-android", iconColor: "#6B8E4E", label: "Android", sub: "Ticket médio R$ 112", pct: "30%" },
                { icon: "ti-device-desktop", iconColor: "#5B8BA6", label: "Desktop", sub: "Ticket médio R$ 248", pct: "8%" },
              ].map((d) => (
                <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--mk-surface-2)", borderRadius: 8 }}>
                  <i className={`ti ${d.icon}`} style={{ fontSize: 18, color: d.iconColor }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "var(--mk-text)", fontWeight: 500 }}>{d.label}</div>
                    <div style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>{d.sub}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mk-text)" }}>{d.pct}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CLIENTES SEMÁFORO */}
      <div className="mk-card mk-card-lg">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h3 className="card-title">Clientes ativos · semáforo</h3>
            <p className="card-sub">Visão consolidada por conta</p>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--mk-accent)", fontWeight: 600, cursor: "pointer" }}>Ver todos →</span>
        </div>
        <table className="mk-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th style={{ textAlign: "right" }}>Investido</th>
              <th style={{ textAlign: "right" }}>Faturado</th>
              <th style={{ textAlign: "right" }}>ROAS</th>
              <th style={{ textAlign: "right" }}>Crescimento</th>
              <th style={{ textAlign: "right" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {clientesMock.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className="row-meta">
                    <div className="row-avatar" style={{ background: c.bg }}>{c.iniciais}</div>
                    <div>
                      <div className="name">{c.nome}</div>
                      <div className="row-sub">{c.segmento}</div>
                    </div>
                  </div>
                </td>
                <td className="num">{c.investido}</td>
                <td className="num" style={{ color: "var(--mk-text)", fontWeight: 600 }}>{c.faturado}</td>
                <td className="num" style={{ color: c.roasColor, fontWeight: 600 }}>{c.roas}</td>
                <td className="num" style={{ color: c.growthColor, fontWeight: 600 }}>{c.crescimento}</td>
                <td className="num"><span className={`mk-badge ${c.status.cls}`}>{c.status.label}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function KpiCard({ label, value, delta, iconColor, iconBg, icon, arrowDown, negativeDelta }: {
  label: string; value: string; delta: string; iconColor: string; iconBg: string; icon: string;
  arrowDown?: boolean; negativeDelta?: boolean;
}) {
  return (
    <div className="mk-card">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="label-tiny">{label}</span>
        <div className="icon-pill" style={{ background: iconBg, color: iconColor }}>
          <i className={`ti ${icon}`} style={{ fontSize: 14 }} />
        </div>
      </div>
      <div className="big-num">{value}</div>
      <div className={negativeDelta ? "delta-down" : "delta-up"}>
        <i className={`ti ${arrowDown ? "ti-arrow-down-right" : "ti-arrow-up-right"}`} style={{ fontSize: 12 }} />
        {delta}
      </div>
    </div>
  );
}

function DestaqueCard({ color, bg, icon, label, labelColor, titulo, sub }: {
  color: string; bg: string; icon: string; label: string; labelColor: string; titulo: string; sub: string;
}) {
  return (
    <div className="mk-card" style={{ borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFDF8", flexShrink: 0 }}>
          <i className={`ti ${icon}`} style={{ fontSize: 18 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="label-tiny" style={{ color: labelColor }}>{label}</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--mk-text)", marginTop: 3 }}>{titulo}</div>
          <div style={{ fontSize: 11, color: "var(--mk-text-secondary)", marginTop: 3 }}>{sub}</div>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, valueColor, pct, gradient }: {
  label: string; value: string; valueColor: string; pct: number; gradient: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 5 }}>
        <span style={{ fontWeight: 500, color: "var(--mk-text)" }}>{label}</span>
        <span style={{ color: valueColor, fontWeight: 600 }}>{value}</span>
      </div>
      <div className="mk-progress"><div style={{ background: gradient, width: `${pct}%` }} /></div>
    </div>
  );
}

interface DonutSeg { color: string; dash: string; offset: number; }
interface DonutLegend { color: string; label: string; value: string; }

function DonutCard({ title, subtitle, centerValue, centerLabel, segments, legend }: {
  title: string; subtitle: string; centerValue: string; centerLabel: string;
  segments: DonutSeg[]; legend: DonutLegend[];
}) {
  return (
    <div className="mk-card mk-card-lg">
      <h3 className="card-title" style={{ marginBottom: 4 }}>{title}</h3>
      <p className="card-sub" style={{ marginBottom: 14 }}>{subtitle}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <svg viewBox="0 0 100 100" width="110" height="110">
          <circle cx="50" cy="50" r="38" fill="none" stroke="var(--mk-surface-2)" strokeWidth="14" />
          {segments.map((s, i) => (
            <circle
              key={i}
              cx="50" cy="50" r="38"
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeDasharray={s.dash}
              strokeDashoffset={s.offset}
              transform="rotate(-90 50 50)"
            />
          ))}
          <text x="50" y="48" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="Poppins" fill="var(--mk-text)">{centerValue}</text>
          <text x="50" y="60" textAnchor="middle" fontSize="6" fontFamily="Poppins" fill="var(--mk-text-muted)">{centerLabel}</text>
        </svg>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
          {legend.map((l) => (
            <div key={l.label} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--mk-text-secondary)" }}>
                <span style={{ width: 8, height: 8, background: l.color, borderRadius: 2 }} />{l.label}
              </span>
              <span style={{ fontWeight: 600, color: "var(--mk-text)" }}>{l.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
