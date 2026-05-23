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
import { SyncNowButton } from "@/components/shared/SyncNowButton";
import { DashboardKPIs } from "./_components/DashboardKPIs";
import { GastoReceitaChart, StatusDonut, TopCampanhasChart } from "./_components/DashboardCharts";

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
];

function parsePeriodo(p: string | string[] | undefined): Periodo {
  if (p === "hoje" || p === "7d" || p === "30d") return p;
  return "30d";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { supabase, usuario } = await requireUserWithAgencia();
  const primeiroNome = usuario.nome.split(" ")[0];

  const sp = await searchParams;
  const periodo = parsePeriodo(sp.periodo);
  const periodoLabel = PERIODOS.find((x) => x.id === periodo)!.label;

  const integ = await contagemIntegracoes(supabase, usuario.agencia_id);

  if (integ.ativas === 0) {
    return (
      <section className="mk-page">
        <div className="mk-page-head">
          <div className="mk-eyebrow">Painel da agência</div>
          <h1 className="mk-page-title">Bom dia, {primeiroNome}.</h1>
          <p className="mk-page-sub">
            Conecte sua primeira integração pra começar a ver dados reais aqui.
          </p>
        </div>

        <div className="mk-card mk-card-lg" style={{ textAlign: "center", padding: "48px 32px" }}>
          <i
            className="ti ti-plug-off"
            style={{ fontSize: 40, color: "var(--mk-text-muted)", marginBottom: 14 }}
          />
          <h3
            style={{ fontSize: 16, fontWeight: 600, color: "var(--mk-text)", marginBottom: 6 }}
          >
            Nenhuma integração ativa
          </h3>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--mk-text-secondary)",
              maxWidth: 480,
              margin: "0 auto 18px",
              lineHeight: 1.55,
            }}
          >
            Conecte uma conta de Meta Ads pra puxar campanhas, criativos, métricas e
            visualizar tudo aqui.
          </p>
          <Link
            href="/integracoes/meta"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--mk-accent)",
              color: "var(--mk-on-accent, #1a1a1a)",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            <i className="ti ti-plug" style={{ fontSize: 14 }} />
            Conectar Meta Ads
          </Link>
        </div>
      </section>
    );
  }

  const [kpi, serie, top, status] = await Promise.all([
    kpiResumo(supabase, usuario.agencia_id, periodo),
    serieDiaria(supabase, usuario.agencia_id, periodo),
    topCampanhas(supabase, usuario.agencia_id, periodo, 5),
    distribuicaoStatus(supabase, usuario.agencia_id),
  ]);

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="mk-eyebrow">Painel da agência</div>
            <h1 className="mk-page-title">Bom dia, {primeiroNome}.</h1>
            <p className="mk-page-sub">
              {integ.ativas} integração(ões) ativa(s)
              {integ.com_erro > 0 && (
                <span style={{ color: "#C9A227", marginLeft: 6 }}>
                  · {integ.com_erro} com erro
                </span>
              )}
              {" · "}
              {kpi.campanhas_ativas} campanha(s) ativa(s)
            </p>
          </div>
          <SyncNowButton />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 14,
          padding: 4,
          background: "var(--mk-surface)",
          borderRadius: 10,
          border: "1px solid var(--mk-border)",
          alignSelf: "flex-start",
          width: "fit-content",
        }}
      >
        {PERIODOS.map((p) => {
          const active = p.id === periodo;
          return (
            <Link
              key={p.id}
              href={`/dashboard?periodo=${p.id}`}
              style={{
                padding: "5px 12px",
                fontSize: 12,
                borderRadius: 6,
                textDecoration: "none",
                background: active ? "var(--mk-surface-2)" : "transparent",
                color: active ? "var(--mk-text)" : "var(--mk-text-muted)",
                fontWeight: active ? 500 : 400,
              }}
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      <DashboardKPIs kpi={kpi} periodoLabel={periodoLabel} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 14,
          marginTop: 14,
        }}
      >
        <GastoReceitaChart data={serie} />
        <StatusDonut data={status} />
      </div>

      <div style={{ marginTop: 14 }}>
        <TopCampanhasChart data={top} />
      </div>
    </section>
  );
}
