import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserWithAgencia } from "@/lib/auth";
import { fmtBRL, fmtInt, fmtMultX, fmtPct } from "@/lib/format";
import { kpiResumo, type KpiResumo } from "@/lib/meta-ads/queries";
import { ExcluirClienteBotao } from "../_excluir-btn";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  pausado: "Pausado",
  encerrado: "Encerrado",
};

export default async function ClienteDetalhePage({ params }: Props) {
  const { id } = await params;
  const { supabase, usuario } = await requireUserWithAgencia();

  const { data: cliente } = await supabase
    .from("clientes")
    .select(
      "id, nome, slug, segmento, status, valor_mensal, observacoes, data_inicio, created_at",
    )
    .eq("id", id)
    .eq("agencia_id", usuario.agencia_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!cliente) notFound();

  const { data: integracoes } = await supabase
    .from("integracoes")
    .select(
      "id, plataforma, account_id, account_name, status, ultima_sync, erro_ultima_sync, token_expires_at",
    )
    .eq("cliente_id", id)
    .order("plataforma");

  let kpi: KpiResumo | null = null;
  try {
    kpi = await kpiResumoClient(supabase, usuario.agencia_id, id);
  } catch {
    kpi = null;
  }

  const iniciais = cliente.nome
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <Link
          href="/clientes"
          style={{
            fontSize: 12,
            color: "var(--mk-accent)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 8,
          }}
        >
          <i className="ti ti-arrow-left" style={{ fontSize: 13 }} />
          Voltar para clientes
        </Link>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: "linear-gradient(135deg, #8B6F47, #C9A876)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {iniciais}
            </div>
            <div>
              <div className="mk-eyebrow">CRM · Cliente</div>
              <h1 className="mk-page-title" style={{ marginBottom: 4 }}>
                {cliente.nome}
              </h1>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  fontSize: 12,
                  color: "var(--mk-text-muted)",
                }}
              >
                <span
                  className={`mk-badge ${
                    cliente.status === "ativo" ? "b-green" : "b-amber"
                  }`}
                >
                  {STATUS_LABEL[cliente.status] ?? cliente.status}
                </span>
                {cliente.segmento && <span>· {cliente.segmento}</span>}
                <span style={{ fontFamily: "monospace" }}>· {cliente.slug}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href={`/dashboard?cliente=${cliente.id}`}
              className="ghost-btn"
              style={{ fontSize: 12 }}
            >
              <i className="ti ti-layout-dashboard" style={{ fontSize: 13 }} />
              Ver dashboard
            </Link>
            <Link
              href={`/clientes/${cliente.id}/editar`}
              className="ghost-btn"
              style={{ fontSize: 12 }}
            >
              <i className="ti ti-edit" style={{ fontSize: 13 }} />
              Editar
            </Link>
            <ExcluirClienteBotao
              clienteId={cliente.id}
              clienteNome={cliente.nome}
              variant="icon"
            />
          </div>
        </div>
      </div>

      {/* Dados básicos */}
      <div className="grid-3" style={{ marginBottom: 14 }}>
        <InfoCard label="Valor mensal" value={fmtBRL(cliente.valor_mensal)} />
        <InfoCard
          label="Integrações ativas"
          value={String(integracoes?.filter((i) => i.status === "ativa").length ?? 0)}
        />
        <InfoCard
          label="Cadastrado em"
          value={new Date(cliente.created_at).toLocaleDateString("pt-BR")}
        />
      </div>

      {/* KPIs Meta (30d) */}
      {kpi && (
        <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
          <h3 className="card-title" style={{ marginBottom: 12 }}>
            KPIs últimos 30 dias
          </h3>
          <div className="grid-4">
            <Kpi label="Investido" value={fmtBRL(kpi.investido)} />
            <Kpi label="Leads" value={fmtInt(kpi.leads)} />
            <Kpi label="Conversões" value={fmtInt(kpi.conversoes)} />
            <Kpi label="CPL" value={fmtBRL(kpi.cpl)} />
            <Kpi label="CAC" value={fmtBRL(kpi.cac)} />
            <Kpi label="Impressões" value={fmtInt(kpi.impressoes)} />
            <Kpi label="CTR" value={fmtPct(kpi.ctr)} />
            <Kpi label="ROAS" value={fmtMultX(kpi.roas)} />
          </div>
        </div>
      )}

      {/* Integrações */}
      <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h3 className="card-title" style={{ margin: 0 }}>
            Integrações ({integracoes?.length ?? 0})
          </h3>
          <Link
            href="/integracoes/meta"
            className="ghost-btn"
            style={{ fontSize: 11 }}
          >
            <i className="ti ti-plug" style={{ fontSize: 12 }} />
            Gerenciar integrações
          </Link>
        </div>

        {!integracoes || integracoes.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--mk-text-muted)",
              fontSize: 13,
              border: "1px dashed var(--mk-border)",
              borderRadius: 8,
            }}
          >
            Nenhuma integração vinculada.{" "}
            <Link
              href={`/oauth/meta/start?cliente_id=${cliente.id}`}
              style={{ color: "var(--mk-accent)" }}
            >
              Conectar Meta Ads
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {integracoes.map((i) => (
              <div
                key={i.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "0.5px solid var(--mk-border)",
                  background: "var(--mk-surface)",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 7,
                    background: "rgba(60, 100, 200, 0.15)",
                    color: "#3C64C8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 11,
                    flexShrink: 0,
                  }}
                >
                  {i.plataforma === "meta_ads" ? "M" : i.plataforma.slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                    {i.account_name ?? i.account_id}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>
                    {i.plataforma} ·{" "}
                    {i.ultima_sync
                      ? `última sync ${new Date(i.ultima_sync).toLocaleString("pt-BR")}`
                      : "sem sync"}
                  </div>
                  {i.erro_ultima_sync && (
                    <div style={{ fontSize: 10.5, color: "#C97064", marginTop: 2 }}>
                      Erro: {i.erro_ultima_sync.slice(0, 80)}
                    </div>
                  )}
                </div>
                <span
                  className={`mk-badge ${
                    i.status === "ativa" ? "b-green" : "b-amber"
                  }`}
                >
                  {i.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {cliente.observacoes && (
        <div className="mk-card mk-card-lg">
          <h3 className="card-title" style={{ marginBottom: 8 }}>
            Observações
          </h3>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--mk-text-secondary)",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {cliente.observacoes}
          </p>
        </div>
      )}
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="mk-card">
      <div className="label-tiny">{label}</div>
      <div className="big-num" style={{ marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label-tiny" style={{ marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--mk-text)" }}>
        {value}
      </div>
    </div>
  );
}

// Wrapper temporário pra usar kpiResumo filtrando por cliente. O queries.ts
// atual agrega por agencia_id; pra filtrar por cliente precisamos passar
// cliente_id no where das metricas_diarias. Fazemos inline aqui.
import type { SupabaseClient } from "@supabase/supabase-js";
async function kpiResumoClient(
  supabase: SupabaseClient,
  agenciaId: string,
  clienteId: string,
): Promise<KpiResumo> {
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const fim = hoje.toISOString().slice(0, 10);
  const inicio = new Date(hoje);
  inicio.setUTCDate(inicio.getUTCDate() - 29);
  const inicioStr = inicio.toISOString().slice(0, 10);

  const { data: metricas } = await supabase
    .from("metricas_diarias")
    .select("gasto, receita, leads, conversoes, impressoes, cliques")
    .eq("agencia_id", agenciaId)
    .eq("cliente_id", clienteId)
    .gte("data", inicioStr)
    .lte("data", fim);

  let investido = 0;
  let faturamento = 0;
  let leads = 0;
  let conversoes = 0;
  let impressoes = 0;
  let cliques = 0;
  for (const m of metricas ?? []) {
    investido += Number(m.gasto) || 0;
    faturamento += Number(m.receita) || 0;
    leads += Number(m.leads) || 0;
    conversoes += Number(m.conversoes) || 0;
    impressoes += Number(m.impressoes) || 0;
    cliques += Number(m.cliques) || 0;
  }

  const { count: campanhasAtivas } = await supabase
    .from("campanhas")
    .select("id", { count: "exact", head: true })
    .eq("agencia_id", agenciaId)
    .eq("cliente_id", clienteId)
    .eq("status", "ACTIVE");

  return {
    investido,
    faturamento,
    roas: investido > 0 ? faturamento / investido : null,
    leads,
    cpl: leads > 0 ? investido / leads : null,
    cac: conversoes > 0 ? investido / conversoes : null,
    conversoes,
    impressoes,
    cliques,
    ctr: impressoes > 0 ? cliques / impressoes : null,
    campanhas_ativas: campanhasAtivas ?? 0,
  };
}
