import Link from "next/link";
import { requireUserWithAgencia } from "@/lib/auth";
import {
  contagemIntegracoes,
  distribuicaoStatus,
  kpiResumo,
  serieDiaria,
  topCampanhas,
  type Periodo,
} from "@/lib/meta-ads/queries";
import { resolverFaixa, carregarDashboardAtendimentos } from "@/lib/crm/dashboard-queries";
import { SyncNowButton } from "@/components/shared/SyncNowButton";
import { DashboardKPIs } from "./_components/DashboardKPIs";
import { GastoReceitaChart, StatusDonut, TopCampanhasChart } from "./_components/DashboardCharts";
import { DashboardAtendimentos } from "./_components/DashboardAtendimentos";
import { PeriodoToggle, ViewToggle } from "./_components/PeriodoToggle";

function parsePeriodo(p: string | undefined): Periodo {
  if (p === "hoje" || p === "7d" || p === "30d") return p;
  return "30d";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; view?: string; de?: string; ate?: string }>;
}) {
  const { supabase, usuario } = await requireUserWithAgencia();
  const primeiroNome = usuario.nome.split(" ")[0];

  const sp = await searchParams;
  const view: "campanhas" | "atendimentos" = sp.view === "atendimentos" ? "atendimentos" : "campanhas";
  const periodo = parsePeriodo(sp.periodo);
  const faixa = resolverFaixa(sp.periodo, sp.de, sp.ate);

  const integ = await contagemIntegracoes(supabase, usuario.agencia_id);

  // Sem integração: empty state aparece apenas pra view Campanhas. Atendimentos não depende disso.
  if (view === "campanhas" && integ.ativas === 0) {
    return (
      <section className="mk-page">
        <div className="mk-page-head">
          <div className="mk-eyebrow">Painel da agência</div>
          <h1 className="mk-page-title">Bom dia, {primeiroNome}.</h1>
          <p className="mk-page-sub">Conecte sua primeira integração pra ver dados aqui.</p>
        </div>
        <ViewToggle atual={view} />
        <div className="mk-card mk-card-lg" style={{ textAlign: "center", padding: "48px 32px" }}>
          <i className="ti ti-plug-off" style={{ fontSize: 40, color: "var(--mk-text-muted)", marginBottom: 14 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--mk-text)", marginBottom: 6 }}>Nenhuma integração ativa</h3>
          <p style={{ fontSize: 12.5, color: "var(--mk-text-secondary)", maxWidth: 480, margin: "0 auto 18px", lineHeight: 1.55 }}>
            Conecte uma conta de Meta Ads pra puxar campanhas, criativos, métricas. Ou troca pra aba <strong>Atendimentos</strong> acima pra ver vendas e serviços.
          </p>
          <Link href="/integracoes/meta" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--mk-accent)", color: "var(--mk-on-accent, #1a1a1a)", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
            <i className="ti ti-plug" style={{ fontSize: 14 }} /> Conectar Meta Ads
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="mk-eyebrow">Painel da agência</div>
            <h1 className="mk-page-title">Bom dia, {primeiroNome}.</h1>
            <p className="mk-page-sub">
              {view === "campanhas" ? (
                <>
                  {integ.ativas} integração(ões) ativa(s)
                  {integ.com_erro > 0 && <span style={{ color: "#C9A227", marginLeft: 6 }}>· {integ.com_erro} com erro</span>}
                </>
              ) : (
                <>Vendas e serviços fechados · {faixa.label}</>
              )}
            </p>
          </div>
          {view === "campanhas" && <SyncNowButton />}
        </div>
      </div>

      <ViewToggle atual={view} />
      <PeriodoToggle view={view} />

      {view === "campanhas" ? (
        <ViewCampanhas agenciaId={usuario.agencia_id} supabase={supabase} periodo={periodo} periodoLabel={faixa.label} />
      ) : (
        <ViewAtendimentos agenciaId={usuario.agencia_id} supabase={supabase} faixa={faixa} />
      )}
    </section>
  );
}

async function ViewCampanhas({
  agenciaId,
  supabase,
  periodo,
  periodoLabel,
}: {
  agenciaId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  periodo: Periodo;
  periodoLabel: string;
}) {
  const [kpi, serie, top, status] = await Promise.all([
    kpiResumo(supabase, agenciaId, periodo),
    serieDiaria(supabase, agenciaId, periodo),
    topCampanhas(supabase, agenciaId, periodo, 5),
    distribuicaoStatus(supabase, agenciaId),
  ]);

  return (
    <>
      <DashboardKPIs kpi={kpi} periodoLabel={periodoLabel} />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginTop: 14 }}>
        <GastoReceitaChart data={serie} />
        <StatusDonut data={status} />
      </div>
      <div style={{ marginTop: 14 }}>
        <TopCampanhasChart data={top} />
      </div>
    </>
  );
}

async function ViewAtendimentos({
  agenciaId,
  supabase,
  faixa,
}: {
  agenciaId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  faixa: ReturnType<typeof resolverFaixa>;
}) {
  const { kpis, servicos, serie } = await carregarDashboardAtendimentos(supabase, agenciaId, faixa);
  return <DashboardAtendimentos kpis={kpis} servicos={servicos} serie={serie} periodoLabel={faixa.label} />;
}
