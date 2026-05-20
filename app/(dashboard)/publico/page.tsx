const CIDADES = [
  { cidade: "São Paulo, SP", visitas: "11.928", custo: "R$ 0,38", custoColor: "#6B8E4E", conv: "523", pct: "42%" },
  { cidade: "Recife, PE", visitas: "6.252", custo: "R$ 0,42", custoColor: "#6B8E4E", conv: "298", pct: "22%" },
  { cidade: "Campo Grande, MS", visitas: "5.116", custo: "R$ 0,58", custoColor: "#8B6916", conv: "218", pct: "18%" },
  { cidade: "Brasília, DF", visitas: "3.410", custo: "R$ 0,44", custoColor: "#6B8E4E", conv: "142", pct: "12%" },
  { cidade: "Outras", visitas: "1.714", custo: "R$ 0,72", custoColor: "var(--mk-text)", conv: "66", pct: "6%" },
];

export default function PublicoPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Audiência</div>
        <h1 className="mk-page-title">Análise de público</h1>
        <p className="mk-page-sub">Entenda quem está engajando, comprando e visitando os perfis.</p>
      </div>

      <div className="grid-4">
        <div className="mk-card"><span className="label-tiny">Público alcançado</span><div className="big-num">438.520</div><div className="delta-up"><i className="ti ti-arrow-up-right" style={{ fontSize: 12 }} />+22%</div></div>
        <div className="mk-card"><span className="label-tiny">Engajamento</span><div className="big-num">4,2%</div><div className="delta-up"><i className="ti ti-arrow-up-right" style={{ fontSize: 12 }} />+0,3 pp</div></div>
        <div className="mk-card"><span className="label-tiny">Visitas ao perfil</span><div className="big-num">28.420</div><div className="delta-up"><i className="ti ti-arrow-up-right" style={{ fontSize: 12 }} />+18%</div></div>
        <div className="mk-card"><span className="label-tiny">Custo/visita</span><div className="big-num">R$ 0,48</div><div className="delta-up"><i className="ti ti-arrow-down-right" style={{ fontSize: 12 }} />−R$ 0,12</div></div>
      </div>

      <div className="mk-card mk-card-lg">
        <h3 className="card-title" style={{ marginBottom: 4 }}>Top cidades</h3>
        <p className="card-sub" style={{ marginBottom: 14 }}>Onde mais visitam e compram</p>
        <table className="mk-table">
          <thead>
            <tr>
              <th>Cidade</th>
              <th style={{ textAlign: "right" }}>Visitas</th>
              <th style={{ textAlign: "right" }}>Custo/visita</th>
              <th style={{ textAlign: "right" }}>Conversões</th>
              <th style={{ textAlign: "right" }}>% do total</th>
            </tr>
          </thead>
          <tbody>
            {CIDADES.map((c) => (
              <tr key={c.cidade}>
                <td>
                  <div className="name">
                    <i className="ti ti-map-pin" style={{ fontSize: 14, verticalAlign: -2, color: "var(--mk-accent)", marginRight: 5 }} />
                    {c.cidade}
                  </div>
                </td>
                <td className="num">{c.visitas}</td>
                <td className="num" style={{ color: c.custoColor, fontWeight: 600 }}>{c.custo}</td>
                <td className="num">{c.conv}</td>
                <td className="num" style={{ color: "var(--mk-text)", fontWeight: 600 }}>{c.pct}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
