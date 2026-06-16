import Link from "next/link";
import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface LeadRow {
  id: string;
  lead_id: string;
  form_id: string | null;
  campaign_id: string | null;
  ad_id: string | null;
  ctwa_clid: string | null;
  telefone: string | null;
  nome: string | null;
  email: string | null;
  status: string;
  motivo_orfao: string | null;
  contato_id: string | null;
  ticket_id: string | null;
  conciliado_em: string | null;
  criado_em: string;
}

interface CampanhaRow {
  external_id: string;
  nome: string;
}

const PERIODOS: Record<string, number> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "90d": 90,
};

export default async function Page({ searchParams }: { searchParams: Promise<{ periodo?: string; status?: string; campanha?: string }> }) {
  const ctx = await requireAuth();
  const sb = createServiceClient();
  const params = await searchParams;
  const periodo = params.periodo || "7d";
  const dias = PERIODOS[periodo] || 7;
  const desde = new Date(Date.now() - dias * 24 * 3600 * 1000).toISOString();

  let q = sb
    .from("meta_leads")
    .select("id, lead_id, form_id, campaign_id, ad_id, ctwa_clid, telefone, nome, email, status, motivo_orfao, contato_id, ticket_id, conciliado_em, criado_em")
    .eq("agencia_id", ctx.agenciaId)
    .gte("criado_em", desde)
    .order("criado_em", { ascending: false })
    .limit(200);

  if (params.status) q = q.eq("status", params.status);
  if (params.campanha) q = q.eq("campaign_id", params.campanha);

  const { data: leadsRaw } = await q;
  const leads = (leadsRaw || []) as LeadRow[];

  const total = leads.length;
  const conciliados = leads.filter((l) => l.status === "conciliado").length;
  const orfaos = leads.filter((l) => l.status === "orfao").length;
  const erros = leads.filter((l) => l.status === "erro").length;
  const taxa = total ? Math.round((conciliados / total) * 100) : 0;

  const campaignIds = Array.from(new Set(leads.map((l) => l.campaign_id).filter(Boolean) as string[]));
  let campanhas: CampanhaRow[] = [];
  if (campaignIds.length) {
    const { data: c } = await sb
      .from("campanhas")
      .select("external_id, nome")
      .eq("agencia_id", ctx.agenciaId)
      .in("external_id", campaignIds);
    campanhas = (c || []) as CampanhaRow[];
  }
  const nomeCamp = (id: string | null) => campanhas.find((c) => c.external_id === id)?.nome || id || "—";

  return (
    <div className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">META ADS</div>
        <h1 className="mk-page-title">Leads recebidos</h1>
        <p className="mk-page-sub">Leads do Meta Lead Ads + conciliacao automatica com tickets do WhatsApp.</p>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
        <Kpi label="Total" valor={String(total)} cor="var(--mk-text)" />
        <Kpi label="Conciliados" valor={String(conciliados)} cor="#10b981" sub={`${taxa}% conciliacao`} />
        <Kpi label="Orfaos" valor={String(orfaos)} cor="#D97706" sub="aguardando msg WA" />
        <Kpi label="Erros" valor={String(erros)} cor="#C97064" sub="ver motivo na linha" />
      </section>

      <div className="mk-card" style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginRight: 6 }}>Periodo:</span>
        {Object.keys(PERIODOS).map((p) => (
          <Link
            key={p}
            href={{ pathname: "/leads-meta", query: { ...params, periodo: p } }}
            className={`pill-tab ${periodo === p ? "on" : ""}`}
            style={{ textDecoration: "none" }}
          >
            {p}
          </Link>
        ))}
        <span style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginLeft: 18, marginRight: 6 }}>Status:</span>
        <Link href={{ pathname: "/leads-meta", query: { periodo } }} className={`pill-tab ${!params.status ? "on" : ""}`} style={{ textDecoration: "none" }}>Todos</Link>
        {(["novo", "conciliado", "orfao", "erro"] as const).map((s) => (
          <Link
            key={s}
            href={{ pathname: "/leads-meta", query: { ...params, periodo, status: s } }}
            className={`pill-tab ${params.status === s ? "on" : ""}`}
            style={{ textDecoration: "none" }}
          >
            {s}
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="mk-card" style={{ padding: 40, textAlign: "center", color: "var(--mk-text-muted)" }}>
          <i className="ti ti-inbox" style={{ fontSize: 28, marginBottom: 8 }} />
          <div style={{ fontSize: 13 }}>Nenhum lead no periodo.</div>
          <div style={{ fontSize: 11, marginTop: 6 }}>
            Webhook leadgen aguardando primeiro lead. Configure em
            <code style={{ marginLeft: 6, padding: "2px 6px", background: "var(--mk-surface-2)", borderRadius: 4 }}>Meta App &gt; Webhooks &gt; Page leadgen</code>
            apontando pra <code style={{ marginLeft: 4 }}>/api/webhooks/meta/leadgen</code>
          </div>
        </div>
      ) : (
        <div className="mk-card" style={{ overflowX: "auto" }}>
          <table className="mk-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Nome / Telefone</th>
                <th>Campanha</th>
                <th>Status</th>
                <th>Ticket</th>
                <th style={{ textAlign: "right" }}>Recebido</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>
                    <code style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>{l.lead_id.slice(0, 12)}…</code>
                    {l.ctwa_clid && <div style={{ fontSize: 10, color: "#9B7DBF", marginTop: 2 }}><i className="ti ti-link" /> CTWA</div>}
                  </td>
                  <td>
                    <div className="name">{l.nome || "—"}</div>
                    {l.telefone && <div className="row-sub">{l.telefone}</div>}
                    {l.email && <div className="row-sub">{l.email}</div>}
                  </td>
                  <td>{nomeCamp(l.campaign_id)}</td>
                  <td>
                    <StatusBadge status={l.status} motivo={l.motivo_orfao} />
                  </td>
                  <td>
                    {l.ticket_id ? (
                      <Link href={`/atendimentos?ticket=${l.ticket_id}`} className="ghost-btn" style={{ fontSize: 10.5, padding: "3px 10px" }}>
                        <i className="ti ti-message-circle" /> Abrir
                      </Link>
                    ) : (
                      <span style={{ color: "var(--mk-text-muted)", fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td className="num" style={{ fontSize: 11 }}>{new Date(l.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, valor, cor, sub }: { label: string; valor: string; cor: string; sub?: string }) {
  return (
    <div className="mk-card">
      <div className="label-tiny">{label}</div>
      <div className="big-num" style={{ color: cor }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ status, motivo }: { status: string; motivo: string | null }) {
  const cls = status === "conciliado" ? "b-green"
    : status === "orfao" ? "b-amber"
    : status === "erro" ? "b-red"
    : "b-blue";
  return (
    <span className={`mk-badge ${cls}`} title={motivo || ""}>
      {status}
    </span>
  );
}
