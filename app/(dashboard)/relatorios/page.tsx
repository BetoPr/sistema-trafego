const RELATORIOS = [
  { nome: "Mensal — Nov/2025", cliente: "Bruno Odonto", periodo: "01-30 nov", status: { cls: "b-green", label: "● Aberto" } },
  { nome: "Quinzenal — Lead Magnet", cliente: "Ana Coach", periodo: "15-30 nov", status: { cls: "b-green", label: "● Aberto" } },
  { nome: "Catálogo — semanal", cliente: "Loja da Maria", periodo: "24-30 nov", status: { cls: "b-amber", label: "● Pendente" } },
  { nome: "Retargeting — análise", cliente: "Studio Pilates", periodo: "15-30 nov", status: { cls: "b-red", label: "● Não aberto" } },
];

export default function RelatoriosPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Compartilhamento</div>
        <h1 className="mk-page-title">Relatórios</h1>
        <p className="mk-page-sub">Crie e envie relatórios mensais aos clientes.</p>
      </div>

      <div className="grid-4">
        <div className="mk-card"><div className="label-tiny">Enviados (mês)</div><div className="big-num">28</div></div>
        <div className="mk-card"><div className="label-tiny">Taxa de abertura</div><div className="big-num">86%</div></div>
        <div className="mk-card"><div className="label-tiny">Agendados</div><div className="big-num">9</div></div>
        <div className="mk-card"><div className="label-tiny">Templates</div><div className="big-num">5</div></div>
      </div>

      <div className="mk-card mk-card-lg">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h3 className="card-title">Relatórios recentes</h3>
            <p className="card-sub">Últimos 30 dias</p>
          </div>
          <button type="button" className="cta-btn"><i className="ti ti-file-plus" style={{ fontSize: 14 }} />Novo relatório</button>
        </div>
        <table className="mk-table">
          <thead>
            <tr>
              <th>Relatório</th>
              <th>Cliente</th>
              <th>Período</th>
              <th style={{ textAlign: "right" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {RELATORIOS.map((r) => (
              <tr key={r.nome}>
                <td><div className="name">{r.nome}</div></td>
                <td>{r.cliente}</td>
                <td>{r.periodo}</td>
                <td className="num"><span className={`mk-badge ${r.status.cls}`}>{r.status.label}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
