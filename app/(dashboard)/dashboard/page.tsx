import Link from "next/link";
import { requireUserWithAgencia } from "@/lib/auth";
import {
  contagemIntegracoes,
  distribuicaoStatus,
  kpiResumo,
  serieDiaria,
  topCampanhas,
  topCriativos,
  type Periodo,
} from "@/lib/meta-ads/queries";
import { resolverFaixa, carregarDashboardAtendimentos } from "@/lib/crm/dashboard-queries";
import { parseFiltroSP, resolverCampanhasFiltradas } from "@/lib/filtro-ativo/server";
import { SyncNowButton } from "@/components/shared/SyncNowButton";
import AuroraBg from "@/components/layout/AuroraBg";
import { DashboardKPIs } from "./_components/DashboardKPIs";
import { GastoReceitaChart, StatusDonut, TopCampanhasChart } from "./_components/DashboardCharts";
import { CriativosTop } from "./_components/CriativosTop";
import { PeriodoToggle, ViewToggle } from "./_components/PeriodoToggle";
import { AtendimentosLive } from "./_components/AtendimentosLive";
import { MapaContatosEstado } from "./_components/MapaContatosEstado";

function parsePeriodo(p: string | undefined): Periodo {
  if (p === "hoje" || p === "7d" || p === "30d") return p;
  return "30d";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; view?: string; de?: string; ate?: string; pasta?: string; etiqueta?: string; campanha?: string; pasta_nome?: string; etiqueta_nome?: string; campanha_nome?: string }>;
}) {
  const { supabase, usuario } = await requireUserWithAgencia();
  const primeiroNome = usuario.nome.split(" ")[0];

  const sp = await searchParams;
  const filtroAtivo = parseFiltroSP(sp);
  const campanhaIds = await resolverCampanhasFiltradas(supabase, usuario.agencia_id, filtroAtivo);
  // Atendimentos é o padrão — Campanhas fica em standby até a integração Meta ser aprovada em produção
  const view: "campanhas" | "atendimentos" = sp.view === "campanhas" ? "campanhas" : "atendimentos";
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
      <AuroraBg />
      <div className="mk-page-head" style={{ position: "relative", zIndex: 1 }}>
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

      {view === "campanhas" ? (
        <>
          <PeriodoToggle view={view} />
          <ViewCampanhas agenciaId={usuario.agencia_id} supabase={supabase} periodo={periodo} periodoLabel={faixa.label} campanhaIds={campanhaIds} />
        </>
      ) : (
        <ViewAtendimentosLive agenciaId={usuario.agencia_id} supabase={supabase} />
      )}
    </section>
  );
}

async function ViewAtendimentosLive({
  agenciaId,
  supabase,
}: {
  agenciaId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
}) {
  // Carga inicial (30 dias) server-side; filtros viram fetch client sem navegação
  const faixa = resolverFaixa("30d");
  const [dados, { data: servRows }, { data: ticketServRows }] = await Promise.all([
    carregarDashboardAtendimentos(supabase, agenciaId, faixa),
    supabase.from("servicos").select("nome").eq("agencia_id", agenciaId).eq("ativo", true).order("nome"),
    // Inclui nomes ad-hoc usados em fechamentos manuais (últimos 6 meses)
    supabase
      .from("tickets")
      .select("metadata")
      .eq("agencia_id", agenciaId)
      .not("valor_fechado", "is", null)
      .gte("fechado_em", new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString()),
  ]);
  const nomes = new Set<string>();
  for (const s of (servRows as Array<{ nome: string }> | null) || []) {
    if (s?.nome) nomes.add(s.nome.trim());
  }
  for (const t of (ticketServRows as Array<{ metadata: { servico?: string } | null }> | null) || []) {
    const n = (t.metadata?.servico || "").trim();
    if (n) nomes.add(n);
  }
  const servicosDisponiveis = Array.from(nomes).sort();
  return <AtendimentosLive inicial={{ ...dados, label: faixa.label }} servicosDisponiveis={servicosDisponiveis} />;
}

async function ViewCampanhas({
  agenciaId,
  supabase,
  periodo,
  periodoLabel,
  campanhaIds,
}: {
  agenciaId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  periodo: Periodo;
  periodoLabel: string;
  campanhaIds?: string[] | null;
}) {
  const [kpi, serie, top, status, criativos] = await Promise.all([
    kpiResumo(supabase, agenciaId, periodo, campanhaIds),
    serieDiaria(supabase, agenciaId, periodo, campanhaIds),
    topCampanhas(supabase, agenciaId, periodo, 5, campanhaIds),
    distribuicaoStatus(supabase, agenciaId, campanhaIds),
    topCriativos(supabase, agenciaId, periodo, 6, campanhaIds),
  ]);

  return (
    <>
      <DashboardKPIs kpi={kpi} periodoLabel={periodoLabel} />
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 14, marginTop: 14 }}>
        <GastoReceitaChart data={serie} />
        <StatusDonut data={status} />
      </div>
      <div style={{ marginTop: 14 }}>
        <TopCampanhasChart data={top} />
      </div>
      <CriativosTop itens={criativos} />
      <MapaContatosEstado supabase={supabase} agenciaId={agenciaId} />
    </>
  );
}

