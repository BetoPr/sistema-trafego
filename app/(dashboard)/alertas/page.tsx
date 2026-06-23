import { requireUserWithAgencia } from "@/lib/auth";
import AlertasShell, { type AlertaItem, type IntegracaoOpt, type CanalOpt, type ClienteOpt } from "./_shell";

export const dynamic = "force-dynamic";

export default async function AlertasPage() {
  const { supabase, usuario } = await requireUserWithAgencia();
  if (!usuario.agencia_id) {
    return (
      <section className="mk-page">
        <div className="mk-page-head">
          <h1 className="mk-page-title">Alertas</h1>
          <p className="mk-page-sub">Sem agência associada.</p>
        </div>
      </section>
    );
  }

  const [alertasQ, integracoesQ, canaisQ, clientesQ] = await Promise.all([
    supabase
      .from("alertas_meta")
      .select(
        "id, nome, tipo, limite_valor, destino_numero, integracao_id, cliente_id, canal_id, mensagem_template, ativo, ultimo_disparo_em, ultimo_valor_observado",
      )
      .eq("agencia_id", usuario.agencia_id)
      .order("criado_em", { ascending: false }),
    supabase
      .from("integracoes")
      .select("id, plataforma, account_id, account_name, status, cliente_id")
      .eq("agencia_id", usuario.agencia_id)
      .eq("plataforma", "meta_ads")
      .eq("status", "ativa"),
    supabase
      .from("canais")
      .select("id, nome, status, padrao")
      .eq("agencia_id", usuario.agencia_id)
      .order("padrao", { ascending: false }),
    supabase
      .from("clientes")
      .select("id, nome")
      .eq("agencia_id", usuario.agencia_id)
      .is("deleted_at", null)
      .order("nome"),
  ]);

  const alertas: AlertaItem[] = (alertasQ.data || []).map((a) => ({
    id: a.id,
    nome: a.nome,
    tipo: a.tipo as "gasto_dia" | "gasto_mes",
    limite_valor: Number(a.limite_valor),
    destino_numero: a.destino_numero,
    integracao_id: a.integracao_id,
    cliente_id: a.cliente_id,
    canal_id: a.canal_id,
    mensagem_template: a.mensagem_template,
    ativo: a.ativo,
    ultimo_disparo_em: a.ultimo_disparo_em,
    ultimo_valor_observado: a.ultimo_valor_observado != null ? Number(a.ultimo_valor_observado) : null,
  }));
  const integracoes: IntegracaoOpt[] = (integracoesQ.data || []).map((i) => ({
    id: i.id,
    account_id: i.account_id,
    account_name: i.account_name || i.account_id,
    cliente_id: i.cliente_id,
  }));
  const canais: CanalOpt[] = (canaisQ.data || []).map((c) => ({
    id: c.id,
    nome: c.nome,
    status: c.status,
    padrao: !!c.padrao,
  }));
  const clientes: ClienteOpt[] = (clientesQ.data || []).map((c) => ({ id: c.id, nome: c.nome }));

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Monitoramento</div>
        <h1 className="mk-page-title">Alertas inteligentes</h1>
        <p className="mk-page-sub">
          Configure gasto-limite por conta Meta. Quando o gasto bate o limite, o Sonar avisa o número escolhido no
          WhatsApp.
        </p>
      </div>

      <AlertasShell alertas={alertas} integracoes={integracoes} canais={canais} clientes={clientes} />
    </section>
  );
}
