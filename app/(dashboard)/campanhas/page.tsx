import { requireUserWithAgencia } from "@/lib/auth";
import { tabelaAnuncios, type Periodo } from "@/lib/meta-ads/queries";
import { parseFiltroSP, resolverCampanhasFiltradas } from "@/lib/filtro-ativo/server";
import { TabelaAnuncios } from "./_tabela";
import { SyncNowButton } from "@/components/shared/SyncNowButton";
import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";

function parsePeriodo(p?: string): Periodo {
  return p === "hoje" || p === "7d" || p === "30d" ? p : "30d";
}

export default async function CampanhasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { supabase, usuario } = await requireUserWithAgencia();
  const sp = await searchParams;
  const periodo = parsePeriodo(sp.periodo);
  const filtro = parseFiltroSP(sp);
  const campanhaIds = await resolverCampanhasFiltradas(supabase, usuario.agencia_id, filtro);

  const { count: integAtivas } = await supabase
    .from("integracoes")
    .select("id", { count: "exact", head: true })
    .eq("agencia_id", usuario.agencia_id)
    .eq("plataforma", "meta_ads")
    .eq("status", "ativa");

  const linhas = await tabelaAnuncios(supabase, usuario.agencia_id, periodo, campanhaIds);

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="mk-eyebrow">Gestão</div>
            <h1 className="mk-page-title">Campanhas</h1>
            <p className="mk-page-sub">
              Anúncios da plataforma Meta {filtro.tipo ? <span style={{ color: "#00E19A" }}>· filtrado por {filtro.nome}</span> : null}
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {(["hoje", "7d", "30d"] as Periodo[]).map((p) => (
              <Link
                key={p}
                href={`/campanhas?periodo=${p}`}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  borderRadius: 7,
                  background: periodo === p ? "rgba(0,225,154,.14)" : "var(--mk-surface-2)",
                  border: `.5px solid ${periodo === p ? "#00E19A" : "var(--mk-border)"}`,
                  color: periodo === p ? "#00E19A" : "var(--mk-text-secondary)",
                  textDecoration: "none",
                  fontWeight: periodo === p ? 700 : 500,
                }}
              >
                {p === "hoje" ? "Hoje" : p === "7d" ? "7 dias" : "30 dias"}
              </Link>
            ))}
            {(integAtivas ?? 0) > 0 && <SyncNowButton />}
          </div>
        </div>
      </div>

      {(integAtivas ?? 0) === 0 ? (
        <EmptyState
          icon="ti-plug-off"
          iconColor="#C97064"
          iconBg="rgba(201,112,100,.12)"
          titulo="Nenhuma integração Meta Ads conectada"
          descricao="Conecte uma conta de Meta Ads em Integrações para puxar campanhas, conjuntos, anúncios, métricas e criativos."
        />
      ) : (
        <TabelaAnuncios linhas={linhas} />
      )}
    </section>
  );
}
