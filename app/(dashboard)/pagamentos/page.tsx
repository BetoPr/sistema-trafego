import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { TrancadoBanner } from "./_trancado-banner";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

interface PageProps {
  searchParams: Promise<{ trancado?: string }>;
}

const PRECO_CONEXAO_EXTRA = 19;
const PRECO_USUARIO_EXTRA = 5;

interface PlanoDef {
  rotulo: string;
  precoBase: number;
  precoCheio: number;
  canaisInclusos: number;
  usuariosInclusos: number;
  trial: number;
}

const PLANOS: Record<string, PlanoDef> = {
  solo:    { rotulo: "Solo",    precoBase: 29.9,  precoCheio: 41.9,  canaisInclusos: 1, usuariosInclusos: 1,  trial: 7  },
  time:    { rotulo: "Time",    precoBase: 48,    precoCheio: 68.9,  canaisInclusos: 2, usuariosInclusos: 4,  trial: 14 },
  agencia: { rotulo: "Agência", precoBase: 67,    precoCheio: 95.9,  canaisInclusos: 3, usuariosInclusos: 8,  trial: 14 },
  studio:  { rotulo: "Studio",  precoBase: 104.9, precoCheio: 149.9, canaisInclusos: 5, usuariosInclusos: 15, trial: 14 },
};

function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default async function PagamentosPage({ searchParams }: PageProps) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const sb = createServiceClient();

  const [{ count: canaisAtivos }, { count: usuariosAtivos }, { data: agencia }, { data: historico }] = await Promise.all([
    sb.from("canais").select("id", { count: "exact", head: true }).eq("agencia_id", ctx.agenciaId),
    sb.from("usuarios").select("id", { count: "exact", head: true }).eq("agencia_id", ctx.agenciaId).is("deleted_at", null),
    sb.from("agencias").select("tipo_plano, tipo_cliente, valor_mensal, vencimento_em, ultimo_pagamento_em, dia_pagamento, canais_inclusos, usuarios_inclusos, preco_travado, acesso_bloqueado, trial_acaba_em").eq("id", ctx.agenciaId).maybeSingle(),
    sb.from("super_admin_cobrancas_log").select("status, enviada_em, valor, observacao")
      .eq("agencia_id", ctx.agenciaId).order("enviada_em", { ascending: false }).limit(12),
  ]);

  const tipoPlano = (agencia?.tipo_plano as string | null) || "solo";
  const planoDef = PLANOS[tipoPlano] ?? PLANOS.solo;
  const precoTravado = !!agencia?.preco_travado;
  const valorBase = (agencia?.valor_mensal as number | null) ?? (precoTravado ? planoDef.precoBase : planoDef.precoCheio);
  const canaisInclusos = (agencia?.canais_inclusos as number | null) ?? planoDef.canaisInclusos;
  const usuariosInclusos = (agencia?.usuarios_inclusos as number | null) ?? planoDef.usuariosInclusos;
  const nCanais = canaisAtivos ?? 0;
  const nUsuarios = usuariosAtivos ?? 0;
  const conexoesExtras = Math.max(0, nCanais - canaisInclusos);
  const usuariosExtras = Math.max(0, nUsuarios - usuariosInclusos);
  const valorConexoesExtras = conexoesExtras * PRECO_CONEXAO_EXTRA;
  const valorUsuariosExtras = usuariosExtras * PRECO_USUARIO_EXTRA;
  const valorTotal = valorBase + valorConexoesExtras + valorUsuariosExtras;

  const vencimentoEm = agencia?.vencimento_em as string | null;
  const ultimoPagamentoEm = agencia?.ultimo_pagamento_em as string | null;
  const trialAcabaEm = agencia?.trial_acaba_em as string | null;
  const acessoBloqueado = !!agencia?.acesso_bloqueado;
  const agora = new Date();
  const emTrial = trialAcabaEm && new Date(trialAcabaEm) > agora;
  const vencido = vencimentoEm && new Date(vencimentoEm) < agora;

  const trancado = sp.trancado === "1" || acessoBloqueado || (!!vencido && !emTrial);

  const linkPagar = `https://wa.me/5581991594716?text=${encodeURIComponent(
    `Olá! Quero pagar minha mensalidade do Sonar CRM.\n\nPlano: ${planoDef.rotulo}\nTotal: ${BRL.format(valorTotal)}`,
  )}`;

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Assinatura · Cobrança</div>
        <h1 className="mk-page-title">Pagamentos</h1>
        <p className="mk-page-sub">Sua assinatura, vencimento, histórico e ferramentas de pagamento.</p>
      </div>

      {trancado && <TrancadoBanner />}

      {/* Resumo do plano */}
      <div className="meta-card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <span className="mk-badge" style={{ background: "rgba(0,225,154,0.15)", color: "#00E19A", border: "1px solid rgba(0,225,154,0.30)" }}>
              {planoDef.rotulo.toUpperCase()}
              {precoTravado && <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.85 }}>· preço travado</span>}
            </span>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 10 }}>
              {BRL.format(valorTotal)}<span style={{ fontSize: 13, fontWeight: 400, opacity: 0.7 }}>/mês</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--mk-text-muted)", marginTop: 4 }}>
              Próximo vencimento: <strong style={{ color: "var(--mk-text)" }}>{formatarData(vencimentoEm)}</strong>
              {emTrial && <span style={{ marginLeft: 10, color: "#5cd0ff" }}>· Em Trial até {formatarData(trialAcabaEm)}</span>}
            </div>
            <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 2 }}>
              Último pagamento: {formatarData(ultimoPagamentoEm)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <a href={linkPagar} target="_blank" rel="noopener noreferrer" className="cta-btn" style={{ fontSize: 13, padding: "10px 18px" }}>
              <i className="ti ti-brand-whatsapp" style={{ marginRight: 6, color: "#25D366" }} />
              Pagar agora
            </a>
            <a href="https://wa.me/5581991594716?text=Quero%20trocar%20de%20plano" target="_blank" rel="noopener noreferrer"
               style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>
              Trocar de plano →
            </a>
          </div>
        </div>
      </div>

      {/* Breakdown do custo */}
      <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
        <h3 className="card-title" style={{ marginBottom: 4 }}>
          <i className="ti ti-receipt" style={{ marginRight: 6, color: "#00E19A" }} />
          Composição da sua mensalidade
        </h3>
        <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 14 }}>
          Plano base + extras conforme o uso atual.
        </p>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid var(--mk-border)" }}>
              <td style={{ padding: "10px 0" }}>
                <strong>Plano {planoDef.rotulo}</strong>
                <div style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>
                  {canaisInclusos} conexão{canaisInclusos === 1 ? "" : "ões"} · {usuariosInclusos} usuário{usuariosInclusos === 1 ? "" : "s"} incluso{usuariosInclusos === 1 ? "" : "s"}
                </div>
              </td>
              <td style={{ padding: "10px 0", textAlign: "right" }}>{BRL.format(valorBase)}</td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--mk-border)" }}>
              <td style={{ padding: "10px 0" }}>
                Conexões extras
                <div style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>
                  {conexoesExtras} × {BRL.format(PRECO_CONEXAO_EXTRA)}/mês
                </div>
              </td>
              <td style={{ padding: "10px 0", textAlign: "right" }}>{BRL.format(valorConexoesExtras)}</td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--mk-border)" }}>
              <td style={{ padding: "10px 0" }}>
                Usuários extras
                <div style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>
                  {usuariosExtras} × {BRL.format(PRECO_USUARIO_EXTRA)}/mês
                </div>
              </td>
              <td style={{ padding: "10px 0", textAlign: "right" }}>{BRL.format(valorUsuariosExtras)}</td>
            </tr>
            <tr>
              <td style={{ padding: "12px 0", fontWeight: 700 }}>Total mensal</td>
              <td style={{ padding: "12px 0", textAlign: "right", fontWeight: 700, color: "#00E19A", fontSize: 16 }}>
                {BRL.format(valorTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Uso atual */}
      <div className="grid-3" style={{ marginBottom: 14 }}>
        <div className="mk-card">
          <span className="label-tiny">Conexões em uso</span>
          <div className="big-num">{nCanais}<span style={{ fontSize: 14, color: "var(--mk-text-muted)" }}>/{canaisInclusos + Math.max(0, conexoesExtras)}</span></div>
          <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 8 }}>
            +Conexão extra: {BRL.format(PRECO_CONEXAO_EXTRA)}/mês
          </div>
        </div>
        <div className="mk-card">
          <span className="label-tiny">Usuários ativos</span>
          <div className="big-num">{nUsuarios}<span style={{ fontSize: 14, color: "var(--mk-text-muted)" }}>/{usuariosInclusos + Math.max(0, usuariosExtras)}</span></div>
          <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 8 }}>
            +Usuário extra: {BRL.format(PRECO_USUARIO_EXTRA)}/mês
          </div>
        </div>
        <div className="mk-card">
          <span className="label-tiny">Status</span>
          <div className="big-num" style={{ fontSize: 22, color: trancado ? "#FF5C72" : (emTrial ? "#5cd0ff" : "#00E19A") }}>
            {trancado ? "Trancada" : (emTrial ? "Trial" : "Ativa")}
          </div>
          <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 8 }}>
            {trancado
              ? "Regularize pagamento pra liberar"
              : (emTrial ? `Trial até ${formatarData(trialAcabaEm)}` : "Tudo em dia")}
          </div>
        </div>
      </div>

      {/* Histórico */}
      <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
        <h3 className="card-title" style={{ marginBottom: 4 }}>
          <i className="ti ti-history" style={{ marginRight: 6, color: "#5cd0ff" }} />
          Histórico de pagamentos
        </h3>
        <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 14 }}>
          Últimas 12 cobranças processadas.
        </p>
        {(historico && historico.length > 0) ? (
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--mk-border)", color: "var(--mk-text-muted)", textAlign: "left" }}>
                <th style={{ padding: "8px 0" }}>Data</th>
                <th style={{ padding: "8px 0" }}>Status</th>
                <th style={{ padding: "8px 0", textAlign: "right" }}>Valor</th>
                <th style={{ padding: "8px 0" }}>Observação</th>
              </tr>
            </thead>
            <tbody>
              {(historico as Array<{ status: string; enviada_em: string; valor: number | null; observacao: string | null }>).map((c, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--mk-border)" }}>
                  <td style={{ padding: "10px 0" }}>{formatarData(c.enviada_em)}</td>
                  <td style={{ padding: "10px 0" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                      background: c.status === "enviada" ? "rgba(0,225,154,0.12)" : "rgba(255,92,114,0.12)",
                      color: c.status === "enviada" ? "#00E19A" : "#FF5C72",
                    }}>
                      {c.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "right" }}>{c.valor ? BRL.format(c.valor) : "—"}</td>
                  <td style={{ padding: "10px 0", color: "var(--mk-text-muted)" }}>{c.observacao || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ fontSize: 12, color: "var(--mk-text-muted)", textAlign: "center", padding: 24 }}>
            Sem cobranças registradas ainda.
          </div>
        )}
      </div>

      {/* Serviços adicionais */}
      <div className="mk-card mk-card-lg">
        <h3 className="card-title" style={{ marginBottom: 4 }}>
          <i className="ti ti-plus-circle" style={{ marginRight: 6, color: "#9B7DBF" }} />
          Serviços adicionais
        </h3>
        <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 14 }}>
          Adicione conexões ou usuários extras a qualquer momento.
        </p>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="mk-card" style={{ background: "var(--mk-surface)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <i className="ti ti-brand-whatsapp" style={{ fontSize: 22, color: "#25D366" }} />
              <strong>Conexão WhatsApp extra</strong>
            </div>
            <p style={{ fontSize: 12, color: "var(--mk-text-muted)", lineHeight: 1.5, marginBottom: 10 }}>
              Conecte mais um número de WhatsApp. Soma {BRL.format(PRECO_CONEXAO_EXTRA)}/mês na recorrência.
            </p>
            <a href="https://wa.me/5581991594716?text=Quero%20conex%C3%A3o%20WhatsApp%20extra" target="_blank" rel="noopener noreferrer"
               className="cta-btn" style={{ fontSize: 12, padding: "8px 14px" }}>
              Solicitar conexão extra
            </a>
          </div>
          <div className="mk-card" style={{ background: "var(--mk-surface)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <i className="ti ti-user-plus" style={{ fontSize: 22, color: "#9B7DBF" }} />
              <strong>Usuário atendente extra</strong>
            </div>
            <p style={{ fontSize: 12, color: "var(--mk-text-muted)", lineHeight: 1.5, marginBottom: 10 }}>
              Adicione mais um atendente à sua equipe. Soma {BRL.format(PRECO_USUARIO_EXTRA)}/mês na recorrência.
            </p>
            <a href="https://wa.me/5581991594716?text=Quero%20usu%C3%A1rio%20atendente%20extra" target="_blank" rel="noopener noreferrer"
               className="cta-btn" style={{ fontSize: 12, padding: "8px 14px" }}>
              Solicitar usuário extra
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
