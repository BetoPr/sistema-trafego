import Link from "next/link";
import { requireUserWithAgencia } from "@/lib/auth";
import { WizardMeta } from "./_wizard";
import { DesconectarBotao } from "./_desconectar";
import { SincronizarBotao } from "./_sync-btn";

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
  fb_error: "Facebook retornou erro durante autorização",
  missing_params: "Parâmetros OAuth ausentes",
  state_mismatch: "State CSRF não bate (possível ataque ou cookie expirado)",
  state_invalid: "State OAuth inválido ou expirado",
  user_mismatch: "Usuário diferente do que iniciou a conexão",
  usuario_nao_encontrado: "Seu usuário não foi encontrado",
  cliente_invalido: "Cliente inválido para sua agência",
  exchange_failed: "Falha ao trocar code por token Meta",
  list_adaccounts_failed: "Falha ao listar contas de anúncio",
  sem_contas: "Nenhuma ad account vinculada ao usuário Meta",
  sessao_expirada: "Sessão de conexão expirou — refaça",
  cookie_invalido: "Cookie de conexão inválido",
  sync_failed: "Falha ao sincronizar dados Meta",
};

export default async function MetaIntegracaoPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { supabase } = await requireUserWithAgencia();

  const credsSetup = !!(process.env.META_APP_ID && process.env.META_APP_SECRET);

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nome, segmento")
    .is("deleted_at", null)
    .order("nome");

  const { data: integracoes } = await supabase
    .from("integracoes")
    .select("id, cliente_id, account_id, account_name, status, token_expires_at, ultima_sync, erro_ultima_sync")
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
        <div className="mk-eyebrow">Conexão · Meta Ads</div>
        <h1 className="mk-page-title">Meta Ads</h1>
        <p className="mk-page-sub">
          Conecte uma conta de anúncios Meta por cliente. Tokens são criptografados antes
          de irem ao banco.
        </p>
      </div>

      {sp.ok && (
        <div
          style={{
            background: "rgba(107,142,78,0.12)",
            borderLeft: "3px solid #6B8E4E",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--mk-text-secondary)",
            marginBottom: 14,
          }}
        >
          <i
            className="ti ti-circle-check"
            style={{ marginRight: 8, color: "#6B8E4E", verticalAlign: -2 }}
          />
          {sp.ok === "sync" ? (
            <>
              Sync concluído. <strong>{sp.campanhas || 0}</strong> campanha(s),{" "}
              <strong>{sp.anuncios || 0}</strong> anúncio(s),{" "}
              <strong>{sp.metricas || 0}</strong> métrica(s) diária(s) atualizadas.
            </>
          ) : (
            <>Conta conectada. Clique em <strong>Sincronizar</strong> pra puxar dados Meta.</>
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

      {/* Status setup credenciais */}
      <div
        className="mk-card mk-card-lg"
        style={{ marginBottom: 14, display: "flex", gap: 12, alignItems: "flex-start" }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: credsSetup ? "rgba(107,142,78,0.2)" : "rgba(201,168,118,0.25)",
            color: credsSetup ? "#6B8E4E" : "#C9A876",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <i
            className={`ti ${credsSetup ? "ti-circle-check" : "ti-alert-circle"}`}
            style={{ fontSize: 20 }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <h3 className="card-title" style={{ marginBottom: 4 }}>
            {credsSetup
              ? "Credenciais da app Meta configuradas"
              : "Falta configurar credenciais"}
          </h3>
          <p className="card-sub" style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 0 }}>
            {credsSetup
              ? "META_APP_ID e META_APP_SECRET detectados em produção. Conexão OAuth pronta."
              : "Adicione META_APP_ID e META_APP_SECRET nas variáveis Vercel + redeploy antes de conectar."}
          </p>
        </div>
      </div>

      {/* Lista de clientes pra conectar */}
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
              Criar cliente
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
                      <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 2 }}>
                        {c.segmento || "—"}
                      </div>
                    )}
                  </div>
                  {conectado ? (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, marginRight: 6 }}>
                        <span className="mk-badge b-green">● Conectado</span>
                        {integ!.ultima_sync && (
                          <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>
                            Última sync: {new Date(integ!.ultima_sync).toLocaleString("pt-BR")}
                          </span>
                        )}
                        {integ!.erro_ultima_sync && (
                          <span style={{ fontSize: 10, color: "#C97064" }}>
                            Erro: {integ!.erro_ultima_sync.slice(0, 60)}
                          </span>
                        )}
                      </div>
                      <SincronizarBotao integracaoId={integ!.id} />
                      <DesconectarBotao integracaoId={integ!.id} />
                    </>
                  ) : credsSetup ? (
                    <Link
                      href={`/oauth/meta/start?cliente_id=${c.id}`}
                      className="cta-btn"
                      style={{ fontSize: 12 }}
                    >
                      <i className="ti ti-plug" style={{ fontSize: 13 }} /> Conectar
                    </Link>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>
                      Configure credenciais
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <details style={{ marginTop: 14 }}>
        <summary
          style={{
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--mk-text)",
            padding: "12px 14px",
            borderRadius: 10,
            background: "var(--mk-surface)",
            border: "0.5px solid var(--mk-border)",
            listStyle: "none",
          }}
        >
          <i className="ti ti-book" style={{ marginRight: 6, verticalAlign: -1 }} />
          Ver tutorial passo a passo (Wizard)
        </summary>
        <div style={{ marginTop: 14 }}>
          <WizardMeta />
        </div>
      </details>
    </section>
  );
}
