import Link from "next/link";
import { requireUserWithAgencia } from "@/lib/auth";
import { DesconectarBotao } from "./_desconectar";
import { SincronizarBotao } from "./_sync-btn";
import { SincronizarPagesBtn } from "./_pages-btn";

interface PageProps {
  searchParams: Promise<{
    erro?: string;
    msg?: string;
    ok?: string;
    campanhas?: string;
    anuncios?: string;
    metricas?: string;
  }>;
}

const ERROS_MSG: Record<string, string> = {
  fb_error: "Facebook retornou erro durante autorização. Tente novamente.",
  missing_params: "Parâmetros OAuth ausentes. Refaça a conexão.",
  state_mismatch:
    "Sessão de autorização expirou (10 min). Clique Conectar novamente e finalize sem pausar.",
  state_invalid:
    "Sessão de autorização inválida. Clique Conectar novamente.",
  user_mismatch:
    "Usuário diferente do que iniciou a conexão. Faça login com a mesma conta e tente novamente.",
  usuario_nao_encontrado: "Seu usuário não foi encontrado.",
  cliente_invalido: "Cliente inválido para sua agência.",
  exchange_failed: "Falha ao trocar code por token Meta. Tente novamente.",
  list_adaccounts_failed:
    "Falha ao listar contas de anúncio. Verifique permissões no Meta.",
  sem_contas:
    "Nenhuma conta de anúncio vinculada ao seu usuário Meta. Adicione uma conta no Business Manager.",
  sessao_expirada: "Sessão expirou. Clique Conectar novamente.",
  cookie_invalido: "Cookie de conexão inválido. Tente novamente.",
  sync_failed: "Falha ao sincronizar dados Meta.",
};

export default async function MetaIntegracaoPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { supabase } = await requireUserWithAgencia();

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nome, segmento")
    .is("deleted_at", null)
    .order("nome");

  const { data: integracoes } = await supabase
    .from("integracoes")
    .select(
      "id, cliente_id, account_id, account_name, status, token_expires_at, ultima_sync, erro_ultima_sync",
    )
    .eq("plataforma", "meta_ads");

  const byCliente = new Map<
    string,
    {
      id: string;
      account_id: string;
      account_name: string | null;
      status: string;
      token_expires_at: string | null;
      ultima_sync: string | null;
      erro_ultima_sync: string | null;
    }
  >();
  for (const i of integracoes || []) {
    byCliente.set(i.cliente_id, i);
  }

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <Link
          href="/integracoes"
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
          Voltar para integrações
        </Link>
        <div className="mk-eyebrow">Integração · Meta Ads</div>
        <h1 className="mk-page-title">Meta Ads</h1>
        <p className="mk-page-sub">
          Conecte uma conta Meta Ads por cliente. Dados de campanhas, ad sets, anúncios e
          métricas são sincronizados sob demanda.
        </p>
      </div>

      {sp.ok && (
        <div
          style={{
            background: "rgba(16,185,129,0.12)",
            borderLeft: "3px solid #10b981",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--mk-text-secondary)",
            marginBottom: 14,
          }}
        >
          <i
            className="ti ti-circle-check"
            style={{ marginRight: 8, color: "#10b981", verticalAlign: -2 }}
          />
          {sp.ok === "sync" ? (
            <>
              Sync concluído. <strong>{sp.campanhas || 0}</strong> campanha(s),{" "}
              <strong>{sp.anuncios || 0}</strong> anúncio(s),{" "}
              <strong>{sp.metricas || 0}</strong> métrica(s) diária(s) atualizadas.
            </>
          ) : (
            <>
              Conta conectada. Clique em <strong>Sincronizar</strong> para puxar dados
              Meta.
            </>
          )}
        </div>
      )}

      {sp.erro && (
        <div
          style={{
            background: "rgba(201,112,100,0.12)",
            borderLeft: "3px solid #C97064",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--mk-text-secondary)",
            marginBottom: 14,
          }}
        >
          <i
            className="ti ti-alert-triangle"
            style={{ marginRight: 8, color: "#C97064", verticalAlign: -2 }}
          />
          <strong>{ERROS_MSG[sp.erro] || "Erro durante conexão"}</strong>
          {sp.msg && <div style={{ marginTop: 4, fontSize: 11, opacity: 0.7 }}>{sp.msg}</div>}
        </div>
      )}

      <div className="mk-card mk-card-lg">
        <h3 className="card-title" style={{ marginBottom: 14 }}>
          Clientes ({clientes?.length || 0})
        </h3>

        {!clientes || clientes.length === 0 ? (
          <div
            style={{
              padding: "24px 14px",
              textAlign: "center",
              color: "var(--mk-text-muted)",
              fontSize: 13,
            }}
          >
            Nenhum cliente cadastrado.{" "}
            <Link href="/clientes/novo" style={{ color: "var(--mk-accent)" }}>
              Cadastrar primeiro cliente
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {clientes.map((c) => {
              const integ = byCliente.get(c.id);
              const conectado = !!integ && integ.status === "ativa";
              return (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "0.5px solid var(--mk-border)",
                    background: "var(--mk-surface)",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: "rgba(155,125,191,0.2)",
                      color: "#9B7DBF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {c.nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--mk-text)",
                      }}
                    >
                      {c.nome}
                    </div>
                    {conectado ? (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--mk-text-muted)",
                          fontFamily: "monospace",
                          marginTop: 2,
                        }}
                      >
                        {integ!.account_name} · {integ!.account_id}
                      </div>
                    ) : (
                      <div
                        style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 2 }}
                      >
                        {c.segmento || "—"}
                      </div>
                    )}
                  </div>
                  {conectado ? (
                    <>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: 4,
                          marginRight: 6,
                        }}
                      >
                        <span className="mk-badge b-green">● Conectado</span>
                        {integ!.ultima_sync && (
                          <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>
                            Última sync:{" "}
                            {new Date(integ!.ultima_sync).toLocaleString("pt-BR")}
                          </span>
                        )}
                        {integ!.erro_ultima_sync && (
                          <span style={{ fontSize: 10, color: "#C97064" }}>
                            Erro: {integ!.erro_ultima_sync.slice(0, 60)}
                          </span>
                        )}
                      </div>
                      <SincronizarBotao integracaoId={integ!.id} />
                      <SincronizarPagesBtn integracaoId={integ!.id} />
                      <DesconectarBotao integracaoId={integ!.id} />
                    </>
                  ) : (
                    <a
                      href={`/oauth/meta/start?cliente_id=${c.id}`}
                      className="cta-btn"
                      style={{ fontSize: 12 }}
                    >
                      <i className="ti ti-plug" style={{ fontSize: 13 }} /> Conectar Meta Ads
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
