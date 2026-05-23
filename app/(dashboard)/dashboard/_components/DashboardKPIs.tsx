import { fmtBRL, fmtInt, fmtMultX, fmtPct } from "@/lib/format";
import type { KpiResumo } from "@/lib/meta-ads/queries";

interface Props {
  kpi: KpiResumo;
  periodoLabel: string;
}

export function DashboardKPIs({ kpi, periodoLabel }: Props) {
  const cards = [
    { label: "Investido", value: fmtBRL(kpi.investido), icon: "ti-currency-dollar", tone: "primary" },
    { label: "Faturamento", value: fmtBRL(kpi.faturamento), icon: "ti-coins", tone: "success" },
    { label: "ROAS", value: fmtMultX(kpi.roas), icon: "ti-target-arrow", tone: "accent" },
    { label: "Leads", value: fmtInt(kpi.leads), icon: "ti-user-plus", tone: "info" },
    { label: "CPL", value: fmtBRL(kpi.cpl), icon: "ti-cash", tone: "muted" },
    { label: "CAC", value: fmtBRL(kpi.cac), icon: "ti-receipt", tone: "muted" },
    { label: "Conversões", value: fmtInt(kpi.conversoes), icon: "ti-shopping-cart", tone: "muted" },
    { label: "CTR", value: fmtPct(kpi.ctr), icon: "ti-pointer", tone: "muted" },
  ];

  return (
    <>
      <div className="grid-4" style={{ marginBottom: 14 }}>
        {cards.slice(0, 4).map((k) => (
          <KpiCard key={k.label} {...k} periodoLabel={periodoLabel} />
        ))}
      </div>
      <div className="grid-4">
        {cards.slice(4).map((k) => (
          <KpiCard key={k.label} {...k} periodoLabel={periodoLabel} />
        ))}
      </div>
    </>
  );
}

function KpiCard({
  label,
  value,
  icon,
  periodoLabel,
}: {
  label: string;
  value: string;
  icon: string;
  tone: string;
  periodoLabel: string;
}) {
  return (
    <div className="mk-card">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="label-tiny">{label}</span>
        <div
          className="icon-pill"
          style={{ background: "var(--mk-surface-2)", color: "var(--mk-text-muted)" }}
        >
          <i className={`ti ${icon}`} style={{ fontSize: 14 }} />
        </div>
      </div>
      <div className="big-num">{value}</div>
      <div style={{ fontSize: 11, marginTop: 5, color: "var(--mk-text-muted)" }}>
        {periodoLabel}
      </div>
    </div>
  );
}
