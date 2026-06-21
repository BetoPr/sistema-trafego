import { fmtBRL, fmtInt, fmtMultX } from "@/lib/format";
import type { KpiResumo } from "@/lib/meta-ads/queries";

interface Props {
  kpi: KpiResumo;
  periodoLabel: string;
}

/**
 * KPIs do Dashboard de Campanhas — 2 grupos com hierarquia visual:
 * - Grupo A (financeiro, grande, em destaque): Investido / Faturamento / Lucro Bruto / ROAS Bruto
 * - Grupo B (tráfego, menor): Impressões / Cliques / CPL / CAC
 */
export function DashboardKPIs({ kpi, periodoLabel }: Props) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 14 }}>
        <KpiFinanceiro
          rotulo="INVESTIDO"
          valor={fmtBRL(kpi.investido)}
          sub={`investido em ads · ${periodoLabel}`}
          icone="ti-coin"
          accent="#F0A35E"
        />
        <KpiFinanceiro
          rotulo="FATURAMENTO"
          valor={fmtBRL(kpi.faturamento)}
          sub={`${fmtInt(kpi.vendas)} vendas fechadas · via CRM`}
          icone="ti-cash-banknote"
          accent="rgba(255,255,255,0.5)"
          iconColor="var(--mk-text-secondary)"
          iconBg="var(--mk-surface-2)"
        />
        <KpiFinanceiro
          rotulo="LUCRO BRUTO"
          valor={fmtBRL(kpi.lucro)}
          sub="faturamento − investido"
          icone="ti-trending-up"
          accent="var(--mk-accent-2)"
          destaque
          valorColor={kpi.lucro < 0 ? "#FB7185" : "var(--mk-accent-2)"}
        />
        <KpiFinanceiro
          rotulo="ROAS BRUTO"
          valor={fmtMultX(kpi.roas)}
          sub="retorno sobre investimento"
          icone="ti-target-arrow"
          accent="var(--mk-accent-2)"
          iconColor="var(--mk-accent-2)"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <KpiTrafego
          rotulo="IMPRESSÕES"
          valor={fmtInt(kpi.impressoes)}
          sub={`alcance ${fmtInt(kpi.alcance)}`}
          icone="ti-eye"
          iconColor="var(--mk-icon-blue)"
        />
        <KpiTrafego
          rotulo="CLIQUES"
          valor={fmtInt(kpi.cliques)}
          sub={
            kpi.ctr != null
              ? `CTR ${(kpi.ctr * 100).toFixed(2).replace(".", ",")}%`
              : "CTR —"
          }
          icone="ti-click"
          iconColor="var(--mk-icon-purple)"
        />
        <KpiTrafego
          rotulo="CPL"
          valor={fmtBRL(kpi.cpl)}
          sub={`custo por lead · ${fmtInt(kpi.leads)} leads`}
          icone="ti-user-plus"
          iconColor="var(--mk-icon-green)"
        />
        <KpiTrafego
          rotulo="CAC"
          valor={fmtBRL(kpi.cac)}
          sub="custo por conversão"
          icone="ti-shopping-cart"
          iconColor="var(--mk-icon-pink)"
        />
      </div>
    </>
  );
}

function KpiFinanceiro({
  rotulo, valor, sub, icone, accent, iconColor, iconBg, destaque, valorColor,
}: {
  rotulo: string; valor: string; sub: string; icone: string;
  accent: string; iconColor?: string; iconBg?: string; destaque?: boolean; valorColor?: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        background: destaque
          ? "linear-gradient(180deg, rgba(16,185,129,0.10), var(--mk-surface))"
          : "var(--mk-surface)",
        border: `0.5px solid ${destaque ? "rgba(16,185,129,0.4)" : "var(--mk-border)"}`,
        borderRadius: 16,
        padding: 18,
        boxShadow: destaque ? "0 0 30px rgba(16,185,129,0.10)" : "none",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${accent}, transparent)`,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: destaque ? "var(--mk-accent-2)" : "var(--mk-text-muted)" }}>
          {rotulo}
        </span>
        <div
          style={{
            width: 30, height: 30, borderRadius: 9,
            background: iconBg || (accent.startsWith("#F0") ? "rgba(240,163,94,0.14)" : "rgba(52,211,153,0.16)"),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <i className={`ti ${icone}`} style={{ fontSize: 16, color: iconColor || accent }} />
        </div>
      </div>
      <div style={{ margin: "12px 0 5px", fontSize: 27, fontWeight: 700, letterSpacing: "-0.5px", color: valorColor || "var(--mk-text)" }}>
        {valor}
      </div>
      <div style={{ fontSize: 11, color: destaque ? "rgba(122,163,148,0.9)" : "var(--mk-text-muted)" }}>{sub}</div>
    </div>
  );
}

function KpiTrafego({
  rotulo, valor, sub, icone, iconColor,
}: {
  rotulo: string; valor: string; sub: string; icone: string; iconColor: string;
}) {
  return (
    <div
      style={{
        background: "var(--mk-surface)",
        border: "0.5px solid var(--mk-border-soft)",
        borderRadius: 14,
        padding: "15px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <i className={`ti ${icone}`} style={{ fontSize: 15, color: iconColor }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--mk-text-muted)" }}>
          {rotulo}
        </span>
      </div>
      <div style={{ margin: "9px 0 3px", fontSize: 21, fontWeight: 700, color: "var(--mk-text)" }}>{valor}</div>
      <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>{sub}</div>
    </div>
  );
}
